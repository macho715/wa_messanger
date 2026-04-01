판정: **예 — 바로 붙여넣어 쓸 수 있는 실전 코드입니다.**

근거: 이 코드는 메시지를 `Shipment truth`로 직접 승격하지 않고 `normalize → parse → work card upsert` 흐름으로 처리하며, `HOLD`를 1급 visible state로 유지합니다. 또한 승인·권한·감사 로그를 백엔드 계약으로 두는 원칙에도 맞습니다.   

다음행동: **아래 2개 파일을 넣고, 앞서 드린 patched SQL이 적용된 상태에서 `WAHA_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`만 설정하면 됩니다.**

가정: `extractSignatureFromHeaders()`의 헤더명은 WAHA 설치 방식에 따라 다를 수 있으니, 실제 헤더가 다르면 그 함수만 수정하십시오.

### `app/api/waha/webhook/route.ts`

```ts
import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeWahaPayload,
  parseWorkCard,
  type NormalizedWahaMessage,
  type ParsedWorkCard,
} from '../../../../lib/waha/parser';

export const runtime = 'nodejs';
export const maxDuration = 15;

type JsonObject = Record<string, unknown>;

type ShipmentLink = {
  id: string;
  canonical_key: string;
  hvdc_ref: string | null;
  sct_ship_no: string | null;
  bl_ref: string | null;
  ci_ref: string | null;
};

type ExistingWorkItem = {
  id: string;
  board_state: string;
  current_event_status: string;
  owner_display_name: string | null;
  shipment_id: string | null;
  shipment_key: string | null;
  last_status_at: string;
  confidence: number | null;
};

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const parsedJson = safeJsonParse(rawBody);
  const supabase = getSupabaseAdmin();

  let rawEventId: number | null = null;

  try {
    rawEventId = await insertRawEvent(
      supabase,
      request,
      parsedJson ?? { raw_body: rawBody },
      rawBody,
    );

    const signatureCheck = verifyWebhookSignature(request.headers, rawBody);
    if (!signatureCheck.ok) {
      await markRawEvent(
        supabase,
        rawEventId,
        'REJECTED',
        signatureCheck.reason ?? 'invalid_signature',
      );

      return Response.json(
        {
          ok: false,
          code: 'invalid_signature',
          reason: signatureCheck.reason ?? 'invalid_signature',
        },
        { status: 403 },
      );
    }

    if (!parsedJson) {
      await markRawEvent(supabase, rawEventId, 'ERROR', 'invalid_json');
      return Response.json(
        { ok: false, code: 'invalid_json' },
        { status: 400 },
      );
    }

    const normalized = normalizeWahaPayload(parsedJson);

    if (!normalized) {
      await markRawEvent(supabase, rawEventId, 'IGNORED', 'not_a_message_event');
      return Response.json({
        ok: true,
        ignored: true,
        reason: 'not_a_message_event',
      });
    }

    if (!normalized.isGroup) {
      await markRawEvent(supabase, rawEventId, 'IGNORED', 'non_group_message');
      return Response.json({
        ok: true,
        ignored: true,
        reason: 'non_group_message',
      });
    }

    const messageRow = await upsertWaMessage(supabase, rawEventId, normalized);
    const parsed = parseWorkCard(normalized);
    const shipment = await findShipmentLink(supabase, parsed.shipmentKeyCandidates);

    await upsertParseResult(supabase, messageRow.id, parsed, shipment?.id ?? null);

    const workItem = await upsertWorkItem(
      supabase,
      normalized,
      parsed,
      messageRow.id,
      shipment,
    );

    await markRawEvent(supabase, rawEventId, 'DONE', null);

    return Response.json({
      ok: true,
      rawEventId,
      messageId: messageRow.id,
      parserAction: parsed.parserAction,
      boardState: workItem?.board_state ?? null,
      workItemId: workItem?.id ?? null,
      shipmentKey: shipment?.canonical_key ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';

    if (rawEventId) {
      await markRawEvent(supabase, rawEventId, 'ERROR', message).catch(() => {
        return null;
      });
    }

    return Response.json(
      {
        ok: false,
        code: 'internal_error',
        message,
      },
      { status: 500 },
    );
  }
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function insertRawEvent(
  supabase: SupabaseClient,
  request: Request,
  payload: JsonObject,
  rawBody: string,
): Promise<number> {
  const eventName =
    pickString([
      payload.event,
      payload.eventName,
      payload.event_name,
      payload.type,
      request.headers.get('x-waha-event'),
    ]) ?? 'unknown';

  const signature =
    extractSignatureFromHeaders(request.headers)?.digest ?? null;

  const { data, error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .insert({
      session_name:
        request.headers.get('x-waha-session') ??
        request.headers.get('x-session-name') ??
        'default',
      event_name: eventName,
      hmac_sha512: signature,
      raw_headers: headersToObject(request.headers),
      raw_payload: payload,
      process_status: 'NEW',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`raw_event_insert_failed: ${error?.message ?? 'no_data'}`);
  }

  return Number(data.id);
}

async function markRawEvent(
  supabase: SupabaseClient,
  rawEventId: number,
  processStatus: string,
  errorMessage: string | null,
): Promise<void> {
  const { error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .update({
      processed_at: new Date().toISOString(),
      process_status: processStatus,
      error_message: errorMessage,
    })
    .eq('id', rawEventId);

  if (error) {
    throw new Error(`raw_event_update_failed: ${error.message}`);
  }
}

async function upsertWaMessage(
  supabase: SupabaseClient,
  rawEventId: number,
  normalized: NormalizedWahaMessage,
): Promise<{ id: number }> {
  const { data, error } = await supabase
    .schema('ops_private')
    .from('wa_message')
    .upsert(
      {
        raw_event_id: rawEventId,
        waha_message_id: normalized.messageId,
        chat_id: normalized.chatId,
        group_name: normalized.groupName,
        is_group: normalized.isGroup,
        from_jid: normalized.fromJid,
        participant_jid: normalized.participantJid,
        reply_to_message_id: normalized.replyToMessageId,
        sent_at: normalized.sentAt,
        body_raw: normalized.bodyRaw,
        body_norm: normalized.bodyNorm,
        has_media: normalized.hasMedia,
        payload: normalized.payload,
      },
      { onConflict: 'waha_message_id' },
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`wa_message_upsert_failed: ${error?.message ?? 'no_data'}`);
  }

  return { id: Number(data.id) };
}

async function upsertParseResult(
  supabase: SupabaseClient,
  messageId: number,
  parsed: ParsedWorkCard,
  shipmentId: string | null,
): Promise<void> {
  const { error } = await supabase
    .schema('ops_private')
    .from('wa_message_parse')
    .upsert(
      {
        message_id: messageId,
        parser_version: parsed.parserVersion,
        parser_action: parsed.parserAction,
        work_type: parsed.workType,
        event_status: parsed.eventStatus,
        board_state: parsed.boardState,
        owner_ref: null,
        shipment_id: shipmentId,
        dedupe_key: parsed.dedupeKey,
        status_reason: parsed.statusReason,
        confidence: parsed.confidence,
        keywords_hit: parsed.keywordsHit,
        extracted: {
          entities: parsed.entities,
          shipment_key_candidates: parsed.shipmentKeyCandidates,
          summary: parsed.summary,
          title: parsed.title,
        },
        extracted_at: new Date().toISOString(),
      },
      { onConflict: 'message_id' },
    );

  if (error) {
    throw new Error(`wa_message_parse_upsert_failed: ${error.message}`);
  }
}

async function findShipmentLink(
  supabase: SupabaseClient,
  candidates: string[],
): Promise<ShipmentLink | null> {
  if (!candidates.length) {
    return null;
  }

  const uniqueCandidates = Array.from(new Set(candidates)).slice(0, 10);
  const columns: Array<keyof Omit<ShipmentLink, 'id'>> = [
    'canonical_key',
    'hvdc_ref',
    'sct_ship_no',
    'bl_ref',
    'ci_ref',
  ];

  for (const candidate of uniqueCandidates) {
    for (const column of columns) {
      const { data, error } = await supabase
        .from('shipment_ref')
        .select('id, canonical_key, hvdc_ref, sct_ship_no, bl_ref, ci_ref')
        .eq(column, candidate)
        .maybeSingle();

      if (error) {
        throw new Error(`shipment_lookup_failed: ${error.message}`);
      }

      if (data) {
        return data as ShipmentLink;
      }
    }
  }

  return null;
}

async function upsertWorkItem(
  supabase: SupabaseClient,
  normalized: NormalizedWahaMessage,
  parsed: ParsedWorkCard,
  messageId: number,
  shipment: ShipmentLink | null,
): Promise<Record<string, unknown> | null> {
  const { data: existing, error: existingError } = await supabase
    .from('work_item')
    .select(
      'id, board_state, current_event_status, owner_display_name, shipment_id, shipment_key, last_status_at, confidence',
    )
    .eq('dedupe_key', parsed.dedupeKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(`work_item_lookup_failed: ${existingError.message}`);
  }

  const existingRow = (existing ?? null) as ExistingWorkItem | null;

  if (parsed.parserAction === 'IGNORE') {
    return null;
  }

  if (parsed.parserAction === 'NO_CHANGE' && !existingRow) {
    return null;
  }

  const nextBoardState =
    parsed.boardState ?? existingRow?.board_state ?? 'NEW';

  const nextEventStatus =
    parsed.eventStatus !== 'UNKNOWN'
      ? parsed.eventStatus
      : existingRow?.current_event_status ?? 'UNKNOWN';

  const nextOwner =
    parsed.ownerDisplayName ?? existingRow?.owner_display_name ?? null;

  const nextShipmentId = shipment?.id ?? existingRow?.shipment_id ?? null;
  const nextShipmentKey =
    shipment?.canonical_key ??
    existingRow?.shipment_key ??
    parsed.shipmentKeyCandidates[0] ??
    null;

  const closedAt =
    nextBoardState === 'DONE' || nextBoardState === 'CANCELED'
      ? normalized.sentAt
      : null;

  const confidence =
    parsed.parserAction === 'NO_CHANGE'
      ? Number(existingRow?.confidence ?? parsed.confidence)
      : parsed.confidence;

  const upsertPayload = {
    dedupe_key: parsed.dedupeKey,
    merge_strategy: inferMergeStrategy(parsed.dedupeKey),
    group_chat_id: normalized.chatId,
    group_name: normalized.groupName,
    work_type: parsed.workType,
    title: parsed.title,
    summary: parsed.summary,
    board_state: nextBoardState,
    current_event_status: nextEventStatus,
    owner_display_name: nextOwner,
    owner_ref: null,
    shipment_id: nextShipmentId,
    shipment_key: nextShipmentKey,
    site_code: parsed.entities.siteCode,
    vessel_name: parsed.entities.vesselName,
    truck_no: parsed.entities.truckNo,
    document_type: parsed.entities.documentType,
    hold_reason_code: parsed.entities.holdReasonCode,
    due_at: parsed.entities.dueAt,
    last_message_at: normalized.sentAt,
    last_status_at:
      parsed.parserAction === 'NO_CHANGE'
        ? existingRow?.last_status_at ?? normalized.sentAt
        : normalized.sentAt,
    closed_at: closedAt,
    confidence,
    meta: {
      parser_version: parsed.parserVersion,
      linkage_status: shipment ? 'CONFIRMED' : 'UNRESOLVED',
      source_event: normalized.eventName,
      source_message_id: normalized.messageId,
      keywords_hit: parsed.keywordsHit,
      shipment_key_candidates: parsed.shipmentKeyCandidates,
    },
  };

  const { data: workItem, error: upsertError } = await supabase
    .from('work_item')
    .upsert(upsertPayload, { onConflict: 'dedupe_key' })
    .select('*')
    .single();

  if (upsertError || !workItem) {
    throw new Error(`work_item_upsert_failed: ${upsertError?.message ?? 'no_data'}`);
  }

  const statusChanged =
    !existingRow ||
    existingRow.board_state !== String(workItem.board_state) ||
    existingRow.current_event_status !== String(workItem.current_event_status);

  if (statusChanged) {
    const { error: historyError } = await supabase
      .from('work_item_status_history')
      .insert({
        work_item_id: workItem.id,
        old_board_state: existingRow?.board_state ?? null,
        new_board_state: workItem.board_state,
        old_event_status: existingRow?.current_event_status ?? null,
        new_event_status: workItem.current_event_status,
        reason: parsed.statusReason,
        source_message_id: messageId,
        confidence: parsed.confidence,
      });

    if (historyError) {
      throw new Error(`work_item_status_history_insert_failed: ${historyError.message}`);
    }
  }

  const { error: linkError } = await supabase
    .from('work_item_message_link')
    .upsert(
      {
        work_item_id: workItem.id,
        message_id: messageId,
        relation_type:
          parsed.parserAction === 'CREATE_ITEM' ? 'CREATED_BY' : 'UPDATED_BY',
      },
      { onConflict: 'work_item_id,message_id' },
    );

  if (linkError) {
    throw new Error(`work_item_message_link_upsert_failed: ${linkError.message}`);
  }

  return workItem as Record<string, unknown>;
}

function inferMergeStrategy(
  dedupeKey: string,
): 'THREAD' | 'REF_NO' | 'CASE_NO' | 'TRUCK_NO' | 'VESSEL_DAY' | 'MANUAL' {
  if (dedupeKey.startsWith('THREAD|')) return 'THREAD';
  if (dedupeKey.startsWith('REF|')) return 'REF_NO';
  if (dedupeKey.startsWith('CASE|')) return 'CASE_NO';
  if (dedupeKey.startsWith('TRUCK|')) return 'TRUCK_NO';
  if (dedupeKey.startsWith('VESSEL|')) return 'VESSEL_DAY';
  return 'MANUAL';
}

function safeJsonParse(raw: string): JsonObject | null {
  try {
    const value = JSON.parse(raw);
    return isRecord(value) ? value : { payload: value as unknown };
  } catch {
    return null;
  }
}

function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.WAHA_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, reason: 'WAHA_WEBHOOK_SECRET_missing' };
    }
    return { ok: true };
  }

  const headerSignature = extractSignatureFromHeaders(headers);
  if (!headerSignature) {
    return { ok: false, reason: 'signature_header_missing' };
  }

  const digest = headerSignature.digest.toLowerCase();
  const algorithms =
    headerSignature.algorithm != null
      ? [headerSignature.algorithm]
      : (['sha512', 'sha256', 'sha1'] as const);

  for (const algorithm of algorithms) {
    const expected = crypto
      .createHmac(algorithm, secret)
      .update(rawBody)
      .digest('hex')
      .toLowerCase();

    if (timingSafeEqual(expected, digest)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: 'signature_mismatch' };
}

function extractSignatureFromHeaders(
  headers: Headers,
): { algorithm: 'sha1' | 'sha256' | 'sha512' | null; digest: string } | null {
  const raw =
    headers.get('x-waha-signature') ??
    headers.get('x-signature') ??
    headers.get('x-webhook-signature') ??
    headers.get('x-hub-signature-256') ??
    headers.get('x-hub-signature') ??
    null;

  if (!raw) {
    return null;
  }

  const value = raw.trim();
  const matched = value.match(/^(sha1|sha256|sha512)=([a-fA-F0-9]+)$/);

  if (matched) {
    const algorithm = matched[1].toLowerCase() as 'sha1' | 'sha256' | 'sha512';
    return {
      algorithm,
      digest: matched[2],
    };
  }

  return {
    algorithm: null,
    digest: value,
  };
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    out[key] = value;
  }
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function pickString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

### `lib/waha/parser.ts`

```ts
export type BoardState =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'HOLD'
  | 'DONE'
  | 'CANCELED';

export type EventStatus =
  | 'UNKNOWN'
  | 'REQUEST'
  | 'ASSIGNED'
  | 'ARRIVED'
  | 'STARTED'
  | 'ONGOING'
  | 'PARTIAL_DONE'
  | 'WAITING_GATE'
  | 'WAITING_DOC'
  | 'WAITING_EQUIPMENT'
  | 'WAITING_REPLY'
  | 'WAITING_WEATHER'
  | 'WAITING_APPROVAL'
  | 'DONE'
  | 'RELEASED'
  | 'CANCELED';

export type WorkType =
  | 'DELIVERY_PLAN'
  | 'GATE_PASS'
  | 'OFFLOADING'
  | 'LOADING'
  | 'DOCUMENT'
  | 'EQUIPMENT'
  | 'VESSEL'
  | 'WAREHOUSE'
  | 'BACKLOAD'
  | 'DAMAGE_OSDR'
  | 'CUSTOMS'
  | 'OOG'
  | 'OTHER';

export type ParserAction =
  | 'CREATE_ITEM'
  | 'UPDATE_ITEM'
  | 'MERGE_ONLY'
  | 'NO_CHANGE'
  | 'IGNORE';

export interface NormalizedWahaMessage {
  eventName: string;
  messageId: string;
  chatId: string;
  groupName: string | null;
  isGroup: boolean;
  fromJid: string | null;
  participantJid: string | null;
  replyToMessageId: string | null;
  sentAt: string;
  bodyRaw: string;
  bodyNorm: string;
  hasMedia: boolean;
  payload: Record<string, unknown>;
}

export interface ParsedEntities {
  refNo: string | null;
  caseNo: string | null;
  truckNo: string | null;
  siteCode: string | null;
  vesselName: string | null;
  cargoDesc: string | null;
  documentType: string | null;
  dueAt: string | null;
  holdReasonCode: string | null;
}

export interface ParsedWorkCard {
  parserVersion: string;
  parserAction: ParserAction;
  workType: WorkType;
  eventStatus: EventStatus;
  boardState: BoardState | null;
  ownerDisplayName: string | null;
  confidence: number;
  statusReason: string;
  dedupeKey: string;
  title: string;
  summary: string | null;
  keywordsHit: string[];
  entities: ParsedEntities;
  shipmentKeyCandidates: string[];
}

const PARSER_VERSION = 'waha-parser.v1.0.0';

const ACK_ONLY = [
  'noted',
  'well noted',
  'copied',
  'ok',
  'okay',
  'thanks',
  'thank you',
  'received with thanks',
  '확인',
  '알겠습니다',
];

const CANCELED = [
  'cancelled',
  'canceled',
  'postponed',
  'deferred',
  'rescheduled',
  '취소',
  '연기',
  '보류종결',
];

const WAITING_GATE = [
  'no gate pass',
  'gate pass pending',
  'security hold',
  'no email at security',
  'entry hold',
  'exit pass pending',
  'cicpa hold',
  'gate outside hold',
  '패스 대기',
  '게이트 홀드',
];

const WAITING_DOC = [
  'pending boe',
  'do pending',
  'msds expired',
  'waiting tpi',
  'fanr pending',
  'document mismatch',
  'customs mismatch',
  'manifest pending',
  'irn pending',
  '서류 대기',
  '인증 대기',
];

const WAITING_EQUIPMENT = [
  'waiting forklift',
  'waiting crane',
  'no operator',
  'no rigger',
  'equipment not ready',
  'breakdown',
  'operator absent',
  '장비 대기',
  '포크리프트 대기',
  '크레인 대기',
];

const WAITING_REPLY = [
  'waiting reply',
  'awaiting confirmation',
  'pending response',
  'awaiting update',
  'no confirmation yet',
  '확답 대기',
  '회신 대기',
  '승인 대기',
];

const WAITING_WEATHER = [
  'high tide',
  'fog delay',
  'weather hold',
  'wind stop',
  'rain delay',
  'anchorage waiting',
  'harbor congestion',
  '조수 대기',
  '기상 대기',
];

const WAITING_APPROVAL = [
  'approval pending',
  'permit pending',
  'dispensation pending',
  'vetting pending',
  'permit not cleared',
  '승인 전',
  '허가 대기',
];

const PARTIAL_DONE = [
  'partial delivery',
  'partially completed',
  'balance pending',
  'remaining qty',
  'balance qty',
  '1st lot done',
  '잔량',
  '부분완료',
  '일부완료',
];

const STARTED = [
  'loading start',
  'unloading start',
  'work started',
  'operation started',
  '착수',
  '시작',
];

const ARRIVED = [
  'arrived',
  'reached',
  'at gate',
  'on site',
  'gate in',
  '도착',
];

const ONGOING = [
  'ongoing',
  'in progress',
  'under process',
  'underway',
  'working',
  'arranging',
  'following up',
  'checking',
  'processing',
  '진행중',
  '조치중',
  '검토중',
  '확인중',
];

const DONE = [
  'done',
  'completed',
  'finished',
  'delivered',
  'received',
  'offloading complete',
  'loading complete',
  'uploaded complete',
  'closed',
  'released',
  'collected',
  '완료',
  '종결',
  '수령완료',
  '반입완료',
];

const REQUEST = [
  'please arrange',
  'pls arrange',
  'please share',
  'please confirm',
  'please check',
  'request',
  'need',
  'required',
  'submit',
  'send',
  'update',
  '요청',
  '제출',
  '회신',
  '공유',
];

const SITE_CODES = [
  'AGI',
  'DAS',
  'SHU',
  'MIR',
  'MOSB',
  'MW4',
  'KIZAD',
  'MUSSAFAH',
  'ALMARKAZ',
  'AL MARKAZ',
];

const DOCUMENT_TYPES = [
  'BOE',
  'DO',
  'MSDS',
  'FANR',
  'TPI',
  'IRN',
  'BL',
  'CI',
  'PL',
  'MWS',
  'NOC',
  'GATE PASS',
  'CICPA',
];

const VESSEL_ALIASES: Array<[RegExp, string]> = [
  [/\bJPTW?71\b/i, 'LCT Jopetwil 71'],
  [/\bJOPETWIL\s*71\b/i, 'LCT Jopetwil 71'],
  [/\bBUSHRA\b/i, 'Bushra'],
];

export function normalizeWahaPayload(input: unknown): NormalizedWahaMessage | null {
  if (!isRecord(input)) {
    return null;
  }

  const level1 = coalesceRecord([input.payload, input.data, input.message, input]);
  const level2 = coalesceRecord([level1?.message, level1?.payload, level1]);

  const eventName =
    pickString([input.event, input.eventName, input.event_name, input.type]) ??
    'message.any';

  if (!isMessageEvent(eventName)) {
    return null;
  }

  const chat = asRecord(level2?.chat);
  const key = asRecord(level2?.key);
  const replyTo = asRecord(level2?.replyTo);
  const quoted = asRecord(level2?.quoted);

  const chatId =
    pickString([
      level2?.chatId,
      level2?.chat_id,
      chat?.id,
      level2?.from,
      level1?.chatId,
    ]) ?? null;

  const messageId =
    pickString([
      level2?.id,
      level2?.messageId,
      key?.id,
      level1?.id,
    ]) ?? null;

  if (!chatId || !messageId) {
    return null;
  }

  const groupName = pickString([
    level2?.groupName,
    level2?.chatName,
    chat?.name,
    level1?.groupName,
  ]);

  const fromJid = pickString([level2?.from, key?.remoteJid, level1?.from]);
  const participantJid = pickString([
    level2?.participant,
    level2?.author,
    key?.participant,
    level1?.participant,
  ]);

  const replyToMessageId = pickString([
    replyTo?.id,
    replyTo?.messageId,
    quoted?.id,
    level2?.quotedMsgId,
    level2?.replyToMessageId,
  ]);

  const bodyRaw =
    pickString([
      level2?.body,
      level2?.text,
      level2?.caption,
      asRecord(level2?.content)?.text,
      asRecord(level2?.message)?.conversation,
      asRecord(level2?.extendedTextMessage)?.text,
      level1?.body,
      level1?.text,
    ]) ?? '';

  const hasMedia = Boolean(
    level2?.media ||
      level2?.mimetype ||
      level2?.mediaUrl ||
      level2?.caption ||
      level2?.isMedia ||
      asRecord(level2?.image) ||
      asRecord(level2?.video) ||
      asRecord(level2?.document),
  );

  const sentAt = toIsoTimestamp(
    level2?.timestamp ?? level2?.time ?? level1?.timestamp ?? Date.now(),
  );

  return {
    eventName,
    messageId,
    chatId,
    groupName,
    isGroup: chatId.endsWith('@g.us'),
    fromJid,
    participantJid,
    replyToMessageId,
    sentAt,
    bodyRaw,
    bodyNorm: normalizeText(bodyRaw),
    hasMedia,
    payload: level2 ?? level1 ?? input,
  };
}

export function parseWorkCard(message: NormalizedWahaMessage): ParsedWorkCard {
  const text = message.bodyNorm;
  const entities = extractEntities(message.bodyRaw, text);
  const ownerDisplayName = extractOwnerName(message.bodyRaw, text);

  const hits = {
    ack: findHits(text, ACK_ONLY),
    canceled: findHits(text, CANCELED),
    waitingGate: findHits(text, WAITING_GATE),
    waitingDoc: findHits(text, WAITING_DOC),
    waitingEquipment: findHits(text, WAITING_EQUIPMENT),
    waitingReply: findHits(text, WAITING_REPLY),
    waitingWeather: findHits(text, WAITING_WEATHER),
    waitingApproval: findHits(text, WAITING_APPROVAL),
    partialDone: findHits(text, PARTIAL_DONE),
    started: findHits(text, STARTED),
    arrived: findHits(text, ARRIVED),
    ongoing: findHits(text, ONGOING),
    done: findHits(text, DONE),
    request: findHits(text, REQUEST),
  };

  const negativeDone =
    containsAny(text, ['balance', 'remaining', 'pending', 'waiting']) ||
    hits.partialDone.length > 0 ||
    hits.waitingGate.length > 0 ||
    hits.waitingDoc.length > 0 ||
    hits.waitingEquipment.length > 0 ||
    hits.waitingReply.length > 0 ||
    hits.waitingWeather.length > 0 ||
    hits.waitingApproval.length > 0;

  let eventStatus: EventStatus = 'UNKNOWN';
  let boardState: BoardState | null = null;
  let parserAction: ParserAction = 'UPDATE_ITEM';
  let statusReason = 'no_rule_matched';

  if (!text && !message.hasMedia) {
    eventStatus = 'UNKNOWN';
    boardState = null;
    parserAction = 'IGNORE';
    statusReason = 'empty_message';
  } else if (isAckOnly(text, hits.ack)) {
    eventStatus = 'UNKNOWN';
    boardState = null;
    parserAction = 'NO_CHANGE';
    statusReason = 'ack_only';
  } else if (hits.canceled.length > 0) {
    eventStatus = 'CANCELED';
    boardState = 'CANCELED';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'canceled';
  } else if (hits.waitingGate.length > 0) {
    eventStatus = 'WAITING_GATE';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_gate';
  } else if (hits.waitingDoc.length > 0) {
    eventStatus = 'WAITING_DOC';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_doc';
  } else if (hits.waitingEquipment.length > 0) {
    eventStatus = 'WAITING_EQUIPMENT';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_equipment';
  } else if (hits.waitingReply.length > 0) {
    eventStatus = 'WAITING_REPLY';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_reply';
  } else if (hits.waitingWeather.length > 0) {
    eventStatus = 'WAITING_WEATHER';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_weather';
  } else if (hits.waitingApproval.length > 0) {
    eventStatus = 'WAITING_APPROVAL';
    boardState = 'HOLD';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'waiting_approval';
  } else if (hits.partialDone.length > 0) {
    eventStatus = 'PARTIAL_DONE';
    boardState = 'IN_PROGRESS';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'partial_done';
  } else if (hits.started.length > 0) {
    eventStatus = 'STARTED';
    boardState = 'IN_PROGRESS';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'started';
  } else if (hits.arrived.length > 0) {
    eventStatus = 'ARRIVED';
    boardState = 'IN_PROGRESS';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'arrived';
  } else if (hits.done.length > 0 && !negativeDone) {
    eventStatus = text.includes('released') || text.includes('collected') ? 'RELEASED' : 'DONE';
    boardState = 'DONE';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'done';
  } else if (hits.ongoing.length > 0) {
    eventStatus = 'ONGOING';
    boardState = 'IN_PROGRESS';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'ongoing';
  } else if (ownerDisplayName) {
    eventStatus = 'ASSIGNED';
    boardState = 'ASSIGNED';
    parserAction = 'UPDATE_ITEM';
    statusReason = 'assigned';
  } else if (hits.request.length > 0) {
    eventStatus = 'REQUEST';
    boardState = 'NEW';
    parserAction = 'CREATE_ITEM';
    statusReason = 'request';
  } else if (message.replyToMessageId || entities.refNo || entities.caseNo || entities.truckNo) {
    eventStatus = 'UNKNOWN';
    boardState = null;
    parserAction = 'MERGE_ONLY';
    statusReason = 'merge_context_only';
  }

  if (eventStatus.startsWith('WAITING_')) {
    entities.holdReasonCode = eventStatus.replace('WAITING_', '');
  }

  const workType = inferWorkType(text, entities);
  const shipmentKeyCandidates = extractShipmentKeyCandidates(message.bodyRaw, entities);
  const dedupeKey = buildDedupeKey(message, entities);
  const title = buildTitle(workType, entities);
  const summary = buildSummary(message.bodyRaw);

  const keywordsHit = Array.from(
    new Set([
      ...hits.canceled,
      ...hits.waitingGate,
      ...hits.waitingDoc,
      ...hits.waitingEquipment,
      ...hits.waitingReply,
      ...hits.waitingWeather,
      ...hits.waitingApproval,
      ...hits.partialDone,
      ...hits.started,
      ...hits.arrived,
      ...hits.ongoing,
      ...hits.done,
      ...hits.request,
    ]),
  );

  const confidence = calculateConfidence({
    parserAction,
    eventStatus,
    ownerFound: Boolean(ownerDisplayName),
    hasEntities: Boolean(
      entities.refNo ||
        entities.caseNo ||
        entities.truckNo ||
        entities.siteCode ||
        entities.vesselName ||
        entities.documentType,
    ),
    hitCount: keywordsHit.length,
  });

  return {
    parserVersion: PARSER_VERSION,
    parserAction,
    workType,
    eventStatus,
    boardState,
    ownerDisplayName,
    confidence,
    statusReason,
    dedupeKey,
    title,
    summary,
    keywordsHit,
    entities,
    shipmentKeyCandidates,
  };
}

function inferWorkType(text: string, entities: ParsedEntities): WorkType {
  if (containsAny(text, ['backload', 'return']) && containsAny(text, ['ccu', 'basket', 'trailer', 'container'])) {
    return 'BACKLOAD';
  }

  if (containsAny(text, ['damage', 'damaged', 'osdr', 'broken', 'poor dunnage', 'crack'])) {
    return 'DAMAGE_OSDR';
  }

  if (containsAny(text, ['oog', 'heavy cargo', 'heavy lift', 'oversize', 'over weight'])) {
    return 'OOG';
  }

  if (containsAny(text, ['boe', 'customs', 'clearance'])) {
    return 'CUSTOMS';
  }

  if (containsAny(text, ['gate pass', 'cicpa', 'noc', 'security hold', 'entry hold', 'exit pass'])) {
    return 'GATE_PASS';
  }

  if (containsAny(text, ['msds', 'tpi', 'fanr', 'irn', 'bl', 'ci', 'pl', 'manifest', 'document'])) {
    return 'DOCUMENT';
  }

  if (containsAny(text, ['forklift', 'crane', 'rigger', 'operator', 'telehandler'])) {
    return 'EQUIPMENT';
  }

  if (
    entities.vesselName ||
    containsAny(text, ['vessel', 'berth', 'tide', 'anchorage', 'fw', 'mgo', 'pre-arrival'])
  ) {
    return 'VESSEL';
  }

  if (containsAny(text, ['warehouse', 'hold at dsv', 'indoor', 'outdoor', 'laydown'])) {
    return 'WAREHOUSE';
  }

  if (containsAny(text, ['loading'])) {
    return 'LOADING';
  }

  if (containsAny(text, ['offloading', 'unloading', 'delivery', 'arrived on site'])) {
    return 'OFFLOADING';
  }

  if (containsAny(text, ['delivery plan', 'dispatch', 'truck plan'])) {
    return 'DELIVERY_PLAN';
  }

  return 'OTHER';
}

function extractEntities(raw: string, norm: string): ParsedEntities {
  const refNo =
    matchGroup(raw, /\b(HVDC[-A-Z0-9_/]+)\b/i) ??
    matchGroup(raw, /\b(TR\d{1,3}[-_]\d{1,4})\b/i) ??
    null;

  const caseNo =
    matchGroup(raw, /(?:case\s*(?:no|#)?\s*[:\-]?\s*)([A-Z0-9\-_/]+)/i) ?? null;

  const truckNumeric =
    matchGroup(raw, /\bTR[#\s-]*([0-9]{3,})\b/i) ??
    matchGroup(raw, /(?:truck\s*(?:no|#)?\s*[:\-]?\s*)([A-Z0-9\-]+)/i);

  const truckNo = truckNumeric
    ? truckNumeric.toUpperCase().startsWith('TR')
      ? truckNumeric.toUpperCase()
      : `TR#${truckNumeric.toUpperCase()}`
    : null;

  const siteCode = extractSiteCode(raw);
  const vesselName = extractVesselName(raw);
  const documentType = extractDocumentType(raw);
  const cargoDesc = extractCargoDesc(norm);

  return {
    refNo,
    caseNo,
    truckNo,
    siteCode,
    vesselName,
    cargoDesc,
    documentType,
    dueAt: null,
    holdReasonCode: null,
  };
}

function extractOwnerName(raw: string, norm: string): string | null {
  const ownerFromLabel =
    matchGroup(raw, /(?:owner|담당)\s*[:\-]\s*([A-Za-z][A-Za-z ._-]{1,40})/i) ??
    matchGroup(raw, /assigned\s+to\s+([A-Za-z][A-Za-z ._-]{1,40})/i);

  if (ownerFromLabel) {
    return ownerFromLabel.trim();
  }

  const mention = matchGroup(raw, /@([A-Za-z0-9._-]{2,40})/);
  if (mention) {
    return mention.trim();
  }

  const imperativeName =
    matchGroup(raw, /^([A-Za-z][A-Za-z ._-]{1,30})\s+(?:please|to follow|follow up)/i) ?? null;

  if (imperativeName) {
    return imperativeName.trim();
  }

  if (norm.includes('담당')) {
    return 'UNRESOLVED_OWNER';
  }

  return null;
}

function extractShipmentKeyCandidates(raw: string, entities: ParsedEntities): string[] {
  const out = new Set<string>();

  if (entities.refNo) out.add(entities.refNo);

  const hvdcMatches = raw.match(/\bHVDC[-A-Z0-9_/]+\b/gi) ?? [];
  for (const item of hvdcMatches) out.add(item.trim());

  const sctShipNo = matchGroup(raw, /SCT\s*SHIP\s*NO\s*[:#-]?\s*([A-Z0-9\-_]+)/i);
  if (sctShipNo) out.add(sctShipNo);

  const blRef = matchGroup(raw, /\bBL\s*(?:NO|#|REF)?\s*[:\-]?\s*([A-Z0-9\-_\/]+)/i);
  if (blRef) out.add(blRef);

  const ciRef = matchGroup(raw, /\bCI\s*(?:NO|#|REF)?\s*[:\-]?\s*([A-Z0-9\-_\/]+)/i);
  if (ciRef) out.add(ciRef);

  return Array.from(out);
}

function buildDedupeKey(
  message: NormalizedWahaMessage,
  entities: ParsedEntities,
): string {
  if (message.replyToMessageId) {
    return `THREAD|${message.chatId}|${message.replyToMessageId}`;
  }

  if (entities.refNo) {
    return `REF|${entities.refNo}`;
  }

  if (entities.caseNo) {
    return `CASE|${entities.caseNo}`;
  }

  if (entities.truckNo) {
    return `TRUCK|${message.chatId}|${entities.truckNo}|${entities.siteCode ?? 'NA'}|${dateKey(message.sentAt)}`;
  }

  if (entities.vesselName) {
    return `VESSEL|${entities.vesselName}|${entities.siteCode ?? 'NA'}|${dateKey(message.sentAt)}`;
  }

  return `MANUAL|${message.chatId}|${normalizeKey(buildSummary(message.bodyRaw) ?? 'no-text')}|${bucket12h(message.sentAt)}`;
}

function buildTitle(workType: WorkType, entities: ParsedEntities): string {
  const parts: string[] = [humanizeWorkType(workType)];

  if (entities.siteCode) parts.push(entities.siteCode);
  if (entities.truckNo) parts.push(entities.truckNo);
  else if (entities.refNo) parts.push(entities.refNo);
  else if (entities.vesselName) parts.push(entities.vesselName);
  else if (entities.documentType) parts.push(entities.documentType);

  return parts.join(' | ');
}

function buildSummary(raw: string): string | null {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length <= 180 ? cleaned : `${cleaned.slice(0, 177)}...`;
}

function calculateConfidence(input: {
  parserAction: ParserAction;
  eventStatus: EventStatus;
  ownerFound: boolean;
  hasEntities: boolean;
  hitCount: number;
}): number {
  if (input.parserAction === 'IGNORE') return 0.1;
  if (input.parserAction === 'NO_CHANGE') return 0.4;
  if (input.parserAction === 'MERGE_ONLY') return 0.55;

  let score = 0.58;

  if (input.eventStatus !== 'UNKNOWN') score += 0.12;
  if (input.ownerFound) score += 0.1;
  if (input.hasEntities) score += 0.1;
  if (input.hitCount >= 2) score += 0.08;

  if (input.eventStatus.startsWith('WAITING_')) score += 0.05;
  if (input.eventStatus === 'DONE' || input.eventStatus === 'STARTED') score += 0.03;

  return Number(Math.min(score, 0.98).toFixed(2));
}

function extractSiteCode(raw: string): string | null {
  for (const code of SITE_CODES) {
    const regex = new RegExp(`\\b${escapeRegex(code)}\\b`, 'i');
    if (regex.test(raw)) {
      return code.replace(/\s+/g, '');
    }
  }
  return null;
}

function extractVesselName(raw: string): string | null {
  for (const [regex, canonical] of VESSEL_ALIASES) {
    if (regex.test(raw)) {
      return canonical;
    }
  }
  return null;
}

function extractDocumentType(raw: string): string | null {
  for (const doc of DOCUMENT_TYPES) {
    const regex = new RegExp(`\\b${escapeRegex(doc)}\\b`, 'i');
    if (regex.test(raw)) {
      return doc.replace(/\s+/g, ' ');
    }
  }
  return null;
}

function extractCargoDesc(norm: string): string | null {
  const cargoKeywords = [
    'aggregate',
    'dune sand',
    'hcs',
    'wall panel',
    'cable drum',
    'ccu',
    'basket',
    'transformer oil',
    'conduit',
  ];

  for (const keyword of cargoKeywords) {
    if (norm.includes(keyword)) {
      return keyword.toUpperCase();
    }
  }

  return null;
}

function isMessageEvent(eventName: string): boolean {
  const normalized = eventName.trim().toLowerCase();
  return (
    normalized === 'message.any' ||
    normalized === 'message' ||
    normalized === 'message.upsert' ||
    normalized === 'messages.upsert'
  );
}

function isAckOnly(text: string, ackHits: string[]): boolean {
  if (!text) return false;
  if (ackHits.length === 0) return false;

  const stripped = normalizeText(
    text
      .replace(/[.!?,]/g, ' ')
      .replace(/\b(thanks|thank you|noted|ok|okay|copied)\b/gi, ' ')
      .replace(/\b(확인|알겠습니다)\b/gi, ' '),
  );

  return stripped.length === 0;
}

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(normalizeText(phrase)));
}

function findHits(text: string, phrases: string[]): string[] {
  return phrases.filter((phrase) => text.includes(normalizeText(phrase)));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function humanizeWorkType(workType: WorkType): string {
  const map: Record<WorkType, string> = {
    DELIVERY_PLAN: 'Delivery Plan',
    GATE_PASS: 'Gate Pass',
    OFFLOADING: 'Offloading',
    LOADING: 'Loading',
    DOCUMENT: 'Document',
    EQUIPMENT: 'Equipment',
    VESSEL: 'Vessel Ops',
    WAREHOUSE: 'Warehouse',
    BACKLOAD: 'Backload',
    DAMAGE_OSDR: 'Damage / OSDR',
    CUSTOMS: 'Customs',
    OOG: 'OOG',
    OTHER: 'Operational Task',
  };

  return map[workType];
}

function toIsoTimestamp(value: unknown): string {
  if (typeof value === 'number') {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const ms = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
      return new Date(ms).toISOString();
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function bucket12h(iso: string): string {
  const date = new Date(iso);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = date.getUTCHours() < 12 ? '00' : '12';
  return `${yyyy}${mm}${dd}${hh}`;
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function normalizeKey(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function matchGroup(value: string, regex: RegExp): string | null {
  const matched = value.match(regex);
  return matched?.[1]?.trim() ?? null;
}

function coalesceRecord(values: unknown[]): Record<string, unknown> | null {
  for (const value of values) {
    const record = asRecord(value);
    if (record) {
      return record;
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function pickString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
```

이 코드는 `work_item`까지만 안전하게 갱신합니다. `shipment_ref.current_stage`나 document truth는 메시지 하나만으로 덮어쓰지 않도록 의도적으로 막아두었습니다. 

다음 단계는 `lib/waha/signature.ts` 분리와 `classification_rule` DB seed 동기화입니다.

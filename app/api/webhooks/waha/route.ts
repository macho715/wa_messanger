import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { extractWahaSignature, verifyWahaSignature } from '@/lib/waha/verify-signature';
import {
  headersToObject,
  insertRawEventRow,
  markRawEvent,
  mergeOrFinalizeRawEvent,
} from '@/lib/waha/raw-audit';
import { normalizeWahaEvent } from '@/lib/waha/normalize-event';
import { classifyMessage } from '@/lib/parser/classify-message';
import { upsertWorkItemFromEvent } from '@/lib/db/upsert-work-item';
import { extractShipmentKeyCandidates } from '@/lib/db/shipment-candidates';
import { findShipmentLink } from '@/lib/db/find-shipment';
import { upsertWaMessageParse } from '@/lib/db/upsert-wa-message-parse';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const supabase = getSupabaseAdmin();
  const signatureEnvelope = extractWahaSignature(request.headers);
  const headerSig = signatureEnvelope.signature;
  const rawHeaders = headersToObject(request.headers);

  let rawId: number;
  let payload: unknown | null;
  let jsonOk: boolean;
  try {
    const inserted = await insertRawEventRow(supabase, {
      rawBody,
      rawHeaders,
      hmacDigest: headerSig ?? '',
    });
    rawId = inserted.id;
    jsonOk = inserted.jsonOk;
    payload = inserted.payload;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'raw_insert_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  try {
    if (!verifyWahaSignature(rawBody, headerSig, signatureEnvelope.algorithm)) {
      await markRawEvent(supabase, rawId, 'REJECTED', 'invalid signature');
      return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 403 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'verify_error';
    await markRawEvent(supabase, rawId, 'ERROR', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  if (!jsonOk || payload == null) {
    await markRawEvent(supabase, rawId, 'ERROR', 'invalid json');
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const event = normalizeWahaEvent(payload);
  if (!event) {
    await markRawEvent(supabase, rawId, 'IGNORED', 'not_group_message_or_missing_fields');
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: 'not_group_message_or_missing_fields',
    });
  }

  let canonicalRawId: number;
  try {
    canonicalRawId = await mergeOrFinalizeRawEvent(supabase, rawId, event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'raw_finalize_failed';
    await markRawEvent(supabase, rawId, 'ERROR', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const bodyNorm = event.bodyRaw.replace(/\s+/g, ' ').trim();
  const parsed = classifyMessage(event.bodyRaw);
  const candidates = extractShipmentKeyCandidates(event.bodyRaw);
  const shipmentLookup =
    candidates.length > 0 ? findShipmentLink(supabase, candidates) : Promise.resolve(null);

  const [msgResult, shipmentRefId] = await Promise.all([
    supabase.rpc('ops_upsert_wa_message', {
      p_waha_message_id: event.messageId,
      p_chat_id: event.groupId,
      p_from_jid: event.participantId,
      p_reply_to_message_id: event.replyToMessageId,
      p_body_raw: event.bodyRaw,
      p_body_norm: bodyNorm,
      p_sent_at: event.sentAt,
      p_payload_json: event.payload as object,
      p_raw_event_id: canonicalRawId,
    }),
    shipmentLookup,
  ]);

  const { data: msgRowId, error: msgError } = msgResult;
  if (msgError) {
    await markRawEvent(supabase, canonicalRawId, 'ERROR', msgError.message);
    return NextResponse.json({ ok: false, error: msgError.message }, { status: 500 });
  }

  try {
    await upsertWaMessageParse(supabase, Number(msgRowId), parsed, { shipmentRefId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'parse_ledger_failed';
    await markRawEvent(supabase, canonicalRawId, 'ERROR', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const result = await upsertWorkItemFromEvent(supabase, event, parsed, {
    shipmentRefId: shipmentRefId ?? undefined,
  });

  await markRawEvent(supabase, canonicalRawId, 'DONE');

  return NextResponse.json({
    ok: true,
    messageId: event.messageId,
    rawEventId: canonicalRawId,
    workItemId: result.workItemId,
    mode: result.mode,
    shipmentRefId,
    parsed: {
      boardState: parsed.boardState,
      eventStatus: parsed.eventStatus,
      typeCode: parsed.typeCode,
      parserAction: parsed.parserAction,
    },
  });
}

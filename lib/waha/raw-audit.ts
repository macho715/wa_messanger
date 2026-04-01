import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedWahaEvent } from '@/lib/waha/normalize-event';

export type RawProcessStatus = 'NEW' | 'REJECTED' | 'ERROR' | 'IGNORED' | 'DONE';

export function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function tryParsePayload(rawBody: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(rawBody) as unknown };
  } catch {
    return { ok: false };
  }
}

/** Persist inbound bytes before HMAC verify (mm-style audit). */
export async function insertRawEventRow(
  supabase: SupabaseClient,
  opts: {
    rawBody: string;
    rawHeaders: Record<string, string>;
    hmacDigest: string;
  },
): Promise<{ id: number; jsonOk: boolean; payload: unknown | null }> {
  const parsed = tryParsePayload(opts.rawBody);
  const payloadObj =
    parsed.ok && parsed.value && typeof parsed.value === 'object' && !Array.isArray(parsed.value)
      ? (parsed.value as object)
      : {};

  const { data, error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .insert({
      session_name: process.env.WAHA_SESSION_NAME ?? 'default',
      raw_headers: opts.rawHeaders,
      hmac_digest: opts.hmacDigest,
      raw_body: opts.rawBody,
      payload_json: payloadObj,
      body_raw: opts.rawBody,
      process_status: 'NEW',
    })
    .select('id')
    .single();

  if (error) throw error;
  return {
    id: Number(data.id),
    jsonOk: parsed.ok,
    payload: parsed.ok ? parsed.value : null,
  };
}

export async function markRawEvent(
  supabase: SupabaseClient,
  rawEventId: number,
  status: RawProcessStatus,
  errorMessage?: string | null,
): Promise<void> {
  const { error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .update({
      process_status: status,
      error_message: errorMessage ?? null,
      processed_at: new Date().toISOString(),
    })
    .eq('id', rawEventId);

  if (error) throw error;
}

type RawEnvelope = {
  raw_headers: Record<string, string> | null;
  hmac_digest: string | null;
  raw_body: string | null;
};

async function fetchRawEnvelope(
  supabase: SupabaseClient,
  rawEventId: number,
): Promise<RawEnvelope | null> {
  const { data, error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .select('raw_headers, hmac_digest, raw_body')
    .eq('id', rawEventId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    raw_headers: (data.raw_headers as Record<string, string> | null) ?? null,
    hmac_digest: (data.hmac_digest as string | null) ?? null,
    raw_body: (data.raw_body as string | null) ?? null,
  };
}

/** Attach WhatsApp ids to the audit row; collapse duplicate webhook deliveries on message_id. */
export async function mergeOrFinalizeRawEvent(
  supabase: SupabaseClient,
  preliminaryId: number,
  event: NormalizedWahaEvent,
): Promise<number> {
  const { data: dup, error: dupErr } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .select('id')
    .eq('message_id', event.messageId)
    .maybeSingle();

  if (dupErr) throw dupErr;

  const row = {
    message_id: event.messageId,
    event_type: event.eventType,
    group_id: event.groupId,
    participant_id: event.participantId,
    reply_to_message_id: event.replyToMessageId,
    body_raw: event.bodyRaw,
    payload_json: event.payload as object,
    sent_at: event.sentAt,
  };

  if (dup && Number(dup.id) !== preliminaryId) {
    const env = await fetchRawEnvelope(supabase, preliminaryId);
    const { error: upErr } = await supabase
      .schema('ops_private')
      .from('wa_raw_event')
      .update({
        ...row,
        ...(env
          ? {
              raw_headers: env.raw_headers ?? undefined,
              hmac_digest: env.hmac_digest ?? undefined,
              raw_body: env.raw_body ?? undefined,
            }
          : {}),
      })
      .eq('id', dup.id);
    if (upErr) throw upErr;

    const { error: delErr } = await supabase
      .schema('ops_private')
      .from('wa_raw_event')
      .delete()
      .eq('id', preliminaryId);
    if (delErr) throw delErr;

    return Number(dup.id);
  }

  const { error } = await supabase
    .schema('ops_private')
    .from('wa_raw_event')
    .update(row)
    .eq('id', preliminaryId);

  if (error && (error as { code?: string }).code === '23505') {
    const { data: winner, error: wErr } = await supabase
      .schema('ops_private')
      .from('wa_raw_event')
      .select('id')
      .eq('message_id', event.messageId)
      .maybeSingle();
    if (wErr) throw wErr;
    if (winner?.id && Number(winner.id) !== preliminaryId) {
      const env = await fetchRawEnvelope(supabase, preliminaryId);
      const { error: foldErr } = await supabase
        .schema('ops_private')
        .from('wa_raw_event')
        .update({
          ...row,
          ...(env
            ? {
                raw_headers: env.raw_headers ?? undefined,
                hmac_digest: env.hmac_digest ?? undefined,
                raw_body: env.raw_body ?? undefined,
              }
            : {}),
        })
        .eq('id', winner.id);
      if (foldErr) throw foldErr;
      const { error: delErr } = await supabase
        .schema('ops_private')
        .from('wa_raw_event')
        .delete()
        .eq('id', preliminaryId);
      if (delErr) throw delErr;
      return Number(winner.id);
    }
  }

  if (error) throw error;

  return preliminaryId;
}

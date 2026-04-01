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

  const { data, error } = await supabase.rpc('ops_insert_raw_event', {
    p_session_name: process.env.WAHA_SESSION_NAME ?? 'default',
    p_raw_headers: opts.rawHeaders,
    p_hmac_digest: opts.hmacDigest,
    p_raw_body: opts.rawBody,
    p_payload_json: payloadObj,
    p_body_raw: opts.rawBody,
    p_process_status: 'NEW',
  });

  if (error) throw error;
  return {
    id: Number(data),
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
  const { error } = await supabase.rpc('ops_mark_raw_event', {
    p_raw_event_id: rawEventId,
    p_status: status,
    p_error_message: errorMessage ?? null,
  });

  if (error) throw error;
}

/** Attach WhatsApp ids to the audit row; collapse duplicate webhook deliveries on message_id. */
export async function mergeOrFinalizeRawEvent(
  supabase: SupabaseClient,
  preliminaryId: number,
  event: NormalizedWahaEvent,
): Promise<number> {
  const { data, error } = await supabase.rpc('ops_merge_or_finalize_raw_event', {
    p_preliminary_id: preliminaryId,
    p_message_id: event.messageId,
    p_event_type: event.eventType,
    p_group_id: event.groupId,
    p_participant_id: event.participantId,
    p_reply_to_message_id: event.replyToMessageId,
    p_body_raw: event.bodyRaw,
    p_payload_json: event.payload as object,
    p_sent_at: event.sentAt,
  });
  if (error) throw error;
  return Number(data);
}

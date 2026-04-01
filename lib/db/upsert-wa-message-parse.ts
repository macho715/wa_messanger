import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedMessage } from '@/lib/parser/classify-message';

/** `message_id` column = FK to ops_private.wa_message.id (internal bigint). */
export async function upsertWaMessageParse(
  supabase: SupabaseClient,
  waMessagePk: number,
  parsed: ParsedMessage,
  opts: { shipmentRefId: string | null },
): Promise<void> {
  const shipmentKeyCandidates = parsed.shipmentKeyCandidates ?? [];
  const { error } = await supabase.rpc('ops_upsert_wa_message_parse', {
    p_message_id: waMessagePk,
    p_parser_version: 'spike-mm',
    p_parser_action: parsed.parserAction,
    p_work_type: parsed.typeCode,
    p_event_status: parsed.eventStatus,
    p_board_state: parsed.boardState,
    p_shipment_ref_id: opts.shipmentRefId,
    p_dedupe_key: parsed.dedupeKey,
    p_status_reason: parsed.holdReason,
    p_confidence: parsed.priorityScore,
    p_keywords_hit: parsed.keywordsHit ?? [],
    p_extracted: {
      title: parsed.title,
      summary: parsed.summary ?? null,
      normalized_text: parsed.normalizedText ?? null,
      owner_name: parsed.ownerName,
      hold_reason: parsed.holdReason,
      dedupe_key: parsed.dedupeKey,
      shipment_key_candidates: shipmentKeyCandidates,
    },
  });
  if (error) throw error;
}

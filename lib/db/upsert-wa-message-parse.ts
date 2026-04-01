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
  const { error } = await supabase.schema('ops_private').from('wa_message_parse').upsert(
    {
      message_id: waMessagePk,
      parser_version: 'spike-mm',
      parser_action: parsed.parserAction,
      work_type: parsed.typeCode,
      event_status: parsed.eventStatus,
      board_state: parsed.boardState,
      shipment_ref_id: opts.shipmentRefId,
      dedupe_key: parsed.dedupeKey,
      status_reason: parsed.holdReason,
      confidence: parsed.priorityScore,
      keywords_hit: parsed.keywordsHit ?? [],
      extracted: {
        title: parsed.title,
        summary: parsed.summary ?? null,
        normalized_text: parsed.normalizedText ?? null,
        owner_name: parsed.ownerName,
        hold_reason: parsed.holdReason,
        dedupe_key: parsed.dedupeKey,
        shipment_key_candidates: shipmentKeyCandidates,
      },
    },
    { onConflict: 'message_id' },
  );
  if (error) throw error;
}

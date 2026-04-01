import type { NormalizedWahaEvent } from '@/lib/waha/normalize-event';
import type { ParsedMessage } from '@/lib/parser/classify-message';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BoardState, WorkItemRow } from '@/lib/types/work-item';

const ACTIVE_BOARDS: BoardState[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'HOLD'];

export async function upsertWorkItemFromEvent(
  supabase: SupabaseClient,
  event: NormalizedWahaEvent,
  parsed: ParsedMessage,
  options?: { shipmentRefId?: string | null },
): Promise<{ mode: 'insert' | 'update' | 'noop'; workItemId: string | null }> {
  if (parsed.parserAction === 'IGNORE') {
    return { mode: 'noop', workItemId: null };
  }
  if (parsed.parserAction === 'NO_CHANGE') {
    return { mode: 'noop', workItemId: null };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: candidateError } = await supabase
    .from('work_item')
    .select('*')
    .eq('group_id', event.groupId)
    .eq('type_code', parsed.typeCode)
    .in('board_state', ACTIVE_BOARDS)
    .gte('last_message_at', since)
    .order('last_message_at', { ascending: false })
    .limit(20);

  if (candidateError) throw candidateError;

  const rows = (candidates ?? []) as WorkItemRow[];
  const best = chooseBestCandidate(rows, event, parsed, options?.shipmentRefId ?? null);

  const lastAt = event.sentAt ?? new Date().toISOString();
  const nextShipmentRefId = options?.shipmentRefId ?? best?.shipment_ref_id ?? null;
  const meta = buildWorkItemMeta(event, parsed, nextShipmentRefId);

  if (!best) {
    const { data: inserted, error: insertError } = await supabase
      .from('work_item')
      .insert({
        group_id: event.groupId,
        source_message_id: event.messageId,
        reply_to_message_id: event.replyToMessageId,
        title: parsed.title,
        type_code: parsed.typeCode,
        board_state: parsed.boardState,
        event_status: parsed.eventStatus,
        owner_name: parsed.ownerName,
        hold_reason: parsed.holdReason,
        dedupe_key: parsed.dedupeKey,
        priority_score: parsed.priorityScore,
        last_message_at: lastAt,
        shipment_ref_id: nextShipmentRefId,
        meta,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    await supabase.from('work_item_status_history').insert({
      work_item_id: inserted.id,
      from_board_state: null,
      to_board_state: parsed.boardState,
      from_event_status: null,
      to_event_status: parsed.eventStatus,
      source_message_id: event.messageId,
    });

    return { mode: 'insert', workItemId: inserted.id };
  }

  const { error: updateError } = await supabase
    .from('work_item')
    .update({
      board_state: parsed.boardState,
      event_status: parsed.eventStatus,
      owner_name: parsed.ownerName ?? best.owner_name,
      hold_reason: parsed.holdReason,
      title: parsed.title,
      dedupe_key: parsed.dedupeKey ?? best.dedupe_key,
      priority_score: Math.max(parsed.priorityScore, Number(best.priority_score)),
      last_message_at: lastAt,
      shipment_ref_id: nextShipmentRefId,
      meta,
    })
    .eq('id', best.id);

  if (updateError) throw updateError;

  if (best.board_state !== parsed.boardState || best.event_status !== parsed.eventStatus) {
    await supabase.from('work_item_status_history').insert({
      work_item_id: best.id,
      from_board_state: best.board_state,
      to_board_state: parsed.boardState,
      from_event_status: best.event_status,
      to_event_status: parsed.eventStatus,
      source_message_id: event.messageId,
    });
  }

  return { mode: 'update', workItemId: best.id };
}

function chooseBestCandidate(
  candidates: WorkItemRow[],
  event: NormalizedWahaEvent,
  parsed: ParsedMessage,
  shipmentRefId: string | null,
): WorkItemRow | null {
  let best: WorkItemRow | null = null;
  let bestScore = -1;

  for (const c of candidates) {
    let score = 0;
    if (event.replyToMessageId && c.source_message_id === event.replyToMessageId) score += 100;
    if (event.replyToMessageId && c.reply_to_message_id === event.replyToMessageId) score += 30;
    if (parsed.dedupeKey && c.dedupe_key && parsed.dedupeKey === c.dedupe_key) score += 80;
    if (shipmentRefId && c.shipment_ref_id === shipmentRefId) score += 40;
    if (parsed.ownerName && c.owner_name && parsed.ownerName === c.owner_name) score += 10;
    if (c.board_state === 'HOLD') score += 5;

    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }

  return bestScore >= 30 ? best : null;
}

function buildWorkItemMeta(
  event: NormalizedWahaEvent,
  parsed: ParsedMessage,
  shipmentRefId: string | null,
): Record<string, unknown> {
  return {
    linkage_status: shipmentRefId ? 'CONFIRMED' : 'UNRESOLVED',
    source_event: event.eventType,
    source_message_id: event.messageId,
    reply_to_message_id: event.replyToMessageId,
    normalized_text: parsed.normalizedText ?? null,
    summary: parsed.summary ?? null,
    owner_name: parsed.ownerName,
    hold_reason: parsed.holdReason,
    keywords_hit: parsed.keywordsHit ?? [],
    shipment_key_candidates: parsed.shipmentKeyCandidates ?? [],
  };
}

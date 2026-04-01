import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedMessage } from '@/lib/parser/classify-message';
import { upsertWaMessageParse } from './upsert-wa-message-parse';

function baseParsed(over: Partial<ParsedMessage> = {}): ParsedMessage {
  return {
    title: '[DOC_CUSTOMS] BOE pending',
    boardState: 'HOLD',
    eventStatus: 'WAITING_DOC',
    typeCode: 'DOC_CUSTOMS',
    ownerName: 'Jay',
    holdReason: 'WAIT_DOC',
    priorityScore: 80,
    dedupeKey: 'DOC_CUSTOMS:HVDC-ADOPT-SCT-0001',
    parserAction: 'UPDATE_ITEM',
    normalizedText: 'hvdc-adopt-sct-0001 boe pending at customs owner: jay',
    summary: 'HVDC-ADOPT-SCT-0001 BOE pending at customs owner: Jay',
    keywordsHit: ['BOE', 'pending', 'customs'],
    shipmentKeyCandidates: ['HVDC-ADOPT-SCT-0001'],
    ...over,
  };
}

describe('upsertWaMessageParse', () => {
  it('persists parser evidence instead of empty placeholders', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = {
      rpc(fn: string, payload: Record<string, unknown>) {
        expect(fn).toBe('ops_upsert_wa_message_parse');
        return rpc(fn, payload);
      },
    } as unknown as SupabaseClient;

    await upsertWaMessageParse(client, 42, baseParsed(), {
      shipmentRefId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(rpc).toHaveBeenCalledWith(
      'ops_upsert_wa_message_parse',
      expect.objectContaining({
        p_message_id: 42,
        p_keywords_hit: ['BOE', 'pending', 'customs'],
        p_extracted: expect.objectContaining({
          title: '[DOC_CUSTOMS] BOE pending',
          owner_name: 'Jay',
          hold_reason: 'WAIT_DOC',
          dedupe_key: 'DOC_CUSTOMS:HVDC-ADOPT-SCT-0001',
          shipment_key_candidates: ['HVDC-ADOPT-SCT-0001'],
        }),
      }),
    );
  });
});

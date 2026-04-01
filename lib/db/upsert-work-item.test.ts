import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedWahaEvent } from '@/lib/waha/normalize-event';
import type { ParsedMessage } from '@/lib/parser/classify-message';
import type { WorkItemRow } from '@/lib/types/work-item';
import { upsertWorkItemFromEvent } from './upsert-work-item';

function baseEvent(): NormalizedWahaEvent {
  return {
    eventType: 'message',
    messageId: 'm1',
    groupId: 'g@g.us',
    participantId: null,
    replyToMessageId: null,
    bodyRaw: 'test',
    sentAt: '2026-01-01T00:00:00.000Z',
    payload: {},
  };
}

function baseParsed(over: Partial<ParsedMessage> = {}): ParsedMessage {
  return {
    title: 'T',
    boardState: 'NEW',
    eventStatus: 'REQUEST',
    typeCode: 'OTHER',
    ownerName: null,
    holdReason: null,
    priorityScore: 50,
    dedupeKey: null,
    parserAction: 'UPDATE_ITEM',
    normalizedText: 'test',
    summary: 'test',
    keywordsHit: [],
    shipmentKeyCandidates: [],
    ...over,
  };
}

function mockClient(opts: {
  candidates?: WorkItemRow[];
  insertedId?: string;
}): { client: SupabaseClient; insertPayload: { current: unknown } } {
  const insertPayload: { current: unknown } = { current: null };

  const chain = (rows: WorkItemRow[]) => ({
    eq: () => chain(rows),
    in: () => chain(rows),
    gte: () => chain(rows),
    order: () => chain(rows),
    limit: () => Promise.resolve({ data: rows, error: null }),
  });

  const client = {
    from(table: string) {
      if (table === 'work_item') {
        return {
          select: () => chain(opts.candidates ?? []),
          insert(payload: unknown) {
            insertPayload.current = payload;
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({ data: { id: opts.insertedId ?? 'new-id' }, error: null }),
              }),
            };
          },
          update(_payload: unknown) {
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      if (table === 'work_item_status_history') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, insertPayload };
}

describe('upsertWorkItemFromEvent', () => {
  it('noop on IGNORE without insert', async () => {
    const { client, insertPayload } = mockClient({});
    const r = await upsertWorkItemFromEvent(client, baseEvent(), baseParsed({ parserAction: 'IGNORE' }));
    expect(r.mode).toBe('noop');
    expect(insertPayload.current).toBeNull();
  });

  it('insert sets shipment_ref_id when options passed', async () => {
    const { client, insertPayload } = mockClient({});
    await upsertWorkItemFromEvent(client, baseEvent(), baseParsed(), {
      shipmentRefId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(insertPayload.current).toMatchObject({
      shipment_ref_id: '550e8400-e29b-41d4-a716-446655440000',
      meta: expect.objectContaining({
        linkage_status: 'CONFIRMED',
        source_message_id: 'm1',
      }),
    });
  });

  it('update omits shipment_ref_id when options undefined and preserves best link', async () => {
    const best: WorkItemRow = {
      id: 'wi-1',
      group_id: 'g@g.us',
      source_message_id: 'old',
      reply_to_message_id: null,
      title: 'old',
      type_code: 'OTHER',
      board_state: 'NEW',
      event_status: 'REQUEST',
      owner_name: null,
      hold_reason: null,
      dedupe_key: 'OTHER:REF',
      priority_score: 40,
      last_message_at: '2026-01-01T00:00:00.000Z',
      shipment_ref_id: 'aa0e8400-e29b-41d4-a716-446655440001',
    };
    const updatePayload: { current: unknown } = { current: null };
    const client = {
      from(table: string) {
        if (table === 'work_item') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => ({
                    gte: () => ({
                      order: () => ({
                        limit: () => Promise.resolve({ data: [best], error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update(payload: unknown) {
              updatePayload.current = payload;
              return { eq: () => Promise.resolve({ error: null }) };
            },
          };
        }
        if (table === 'work_item_status_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        throw new Error(table);
      },
    } as unknown as SupabaseClient;

    await upsertWorkItemFromEvent(
      client,
      { ...baseEvent(), messageId: 'm2', replyToMessageId: 'old', bodyRaw: 'reply' },
      baseParsed(),
      undefined,
    );
    expect(updatePayload.current).toMatchObject({
      shipment_ref_id: best.shipment_ref_id,
    });
  });

  it('prefers a candidate with the same shipment_ref_id when dedupe key is absent', async () => {
    const generic: WorkItemRow = {
      id: 'wi-generic',
      group_id: 'g@g.us',
      source_message_id: 'old-1',
      reply_to_message_id: null,
      title: 'generic',
      type_code: 'OTHER',
      board_state: 'IN_PROGRESS',
      event_status: 'ONGOING',
      owner_name: null,
      hold_reason: null,
      dedupe_key: null,
      priority_score: 40,
      last_message_at: '2026-01-01T00:00:00.000Z',
      shipment_ref_id: null,
    };
    const matchingShipment: WorkItemRow = {
      ...generic,
      id: 'wi-shipment',
      source_message_id: 'old-2',
      shipment_ref_id: 'match-shipment',
    };
    const updatePayload: { current: unknown } = { current: null };
    let updatedId: string | null = null;
    const client = {
      from(table: string) {
        if (table === 'work_item') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: () => ({
                    gte: () => ({
                      order: () => ({
                        limit: () =>
                          Promise.resolve({ data: [generic, matchingShipment], error: null }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update(payload: unknown) {
              updatePayload.current = payload;
              return {
                eq(idCol: string, idValue: string) {
                  expect(idCol).toBe('id');
                  updatedId = idValue;
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }
        if (table === 'work_item_status_history') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        throw new Error(table);
      },
    } as unknown as SupabaseClient;

    await upsertWorkItemFromEvent(
      client,
      { ...baseEvent(), messageId: 'm3' },
      baseParsed({ dedupeKey: null, shipmentKeyCandidates: ['HVDC-1'] }),
      { shipmentRefId: 'match-shipment' },
    );

    expect(updatedId).toBe('wi-shipment');
    expect(updatePayload.current).toMatchObject({
      shipment_ref_id: 'match-shipment',
      meta: expect.objectContaining({
        linkage_status: 'CONFIRMED',
        shipment_key_candidates: ['HVDC-1'],
      }),
    });
  });
});

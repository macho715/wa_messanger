import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchWorkItemContext } from './work-item-context';

function mockSupabase() {
  const state = {
    workItemSelect: '',
    messageSelect: '',
    messageIds: [] as string[],
  };

  function from(table: string) {
    if (table === 'work_item') {
      return {
        select(selectCols: string) {
          state.workItemSelect = selectCols;
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    id: 'wi-1',
                    group_id: 'g@g.us',
                    source_message_id: 'msg-source',
                    reply_to_message_id: 'msg-reply',
                    title: 'Gate pass',
                    board_state: 'HOLD',
                    event_status: 'WAITING_DOC',
                    owner_name: 'Amina',
                    hold_reason: 'Waiting for BOE',
                    last_message_at: '2026-04-01T00:00:00.000Z',
                    shipment_ref_id: 'shipment-1',
                    meta: {
                      linkage_status: 'CONFIRMED',
                      source_event: 'message',
                      normalized_text: 'gate pass pending',
                      summary: 'Gate pass pending',
                      owner_name: 'Amina',
                      hold_reason: 'Waiting for BOE',
                      reply_to_message_id: 'msg-reply',
                      keywords_hit: ['BOE', 'gate pass'],
                      shipment_key_candidates: ['HVDC-1'],
                      payload_json: 'do-not-leak',
                    },
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };
    }

    if (table === 'wa_message') {
      return {
        select(selectCols: string) {
          state.messageSelect = selectCols;
          return {
            in(_column: string, ids: string[]) {
              state.messageIds = ids;
              return Promise.resolve({
                data: [
                  {
                    waha_message_id: 'msg-reply',
                    from_jid: 'user2@chat',
                    reply_to_message_id: 'msg-source',
                    body_raw: 'Replied on BOE',
                    body_norm: 'replied on boe',
                    sent_at: '2026-04-01T00:05:00.000Z',
                  },
                  {
                    waha_message_id: 'msg-source',
                    from_jid: 'user1@chat',
                    reply_to_message_id: 'msg-reply',
                    body_raw: 'Gate pass pending',
                    body_norm: 'gate pass pending',
                    sent_at: '2026-04-01T00:00:00.000Z',
                  },
                ],
                error: null,
              });
            },
          };
        },
      };
    }

    throw new Error(`unexpected table ${table}`);
  }

  const client = {
    from,
    schema() {
      return { from };
    },
  } as unknown as SupabaseClient;

  return { client, state };
}

describe('fetchWorkItemContext', () => {
  it('returns a safe work-item context with source and reply evidence only', async () => {
    const { client, state } = mockSupabase();
    const result = await fetchWorkItemContext(client, 'wi-1');

    expect(state.workItemSelect).toContain('id, group_id, source_message_id');
    expect(state.messageSelect).toContain('waha_message_id, from_jid');
    expect(state.messageIds).toEqual(['msg-source', 'msg-reply']);
    expect(result).toEqual({
      workItem: {
        id: 'wi-1',
        groupId: 'g@g.us',
        sourceMessageId: 'msg-source',
        replyToMessageId: 'msg-reply',
        title: 'Gate pass',
        boardState: 'HOLD',
        eventStatus: 'WAITING_DOC',
        ownerName: 'Amina',
        holdReason: 'Waiting for BOE',
        lastMessageAt: '2026-04-01T00:00:00.000Z',
        shipmentRefId: 'shipment-1',
        meta: {
          linkageStatus: 'CONFIRMED',
          sourceEvent: 'message',
          normalizedText: 'gate pass pending',
          summary: 'Gate pass pending',
          ownerName: 'Amina',
          holdReason: 'Waiting for BOE',
          replyToMessageId: 'msg-reply',
          keywordsHit: ['BOE', 'gate pass'],
          shipmentKeyCandidates: ['HVDC-1'],
        },
      },
      evidence: {
        messages: [
          {
            messageId: 'msg-source',
            matches: ['source'],
            fromJid: 'user1@chat',
            replyToMessageId: 'msg-reply',
            bodyRaw: 'Gate pass pending',
            bodyNorm: 'gate pass pending',
            sentAt: '2026-04-01T00:00:00.000Z',
          },
          {
            messageId: 'msg-reply',
            matches: ['reply_to'],
            fromJid: 'user2@chat',
            replyToMessageId: 'msg-source',
            bodyRaw: 'Replied on BOE',
            bodyNorm: 'replied on boe',
            sentAt: '2026-04-01T00:05:00.000Z',
          },
        ],
        missingMessageIds: [],
      },
    });
  });

  it('marks missing evidence rows explicitly', async () => {
    const { client } = mockSupabase();
    function from(table: string) {
      const chain = {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    id: 'wi-1',
                    group_id: 'g@g.us',
                    source_message_id: 'msg-source',
                    reply_to_message_id: 'msg-missing',
                    title: 'Gate pass',
                    board_state: 'NEW',
                    event_status: 'REQUEST',
                    owner_name: null,
                    hold_reason: null,
                    last_message_at: '2026-04-01T00:00:00.000Z',
                    shipment_ref_id: null,
                    meta: {},
                  },
                  error: null,
                }),
              };
            },
          };
        },
      };

      if (table === 'work_item') return chain;
      if (table === 'wa_message') {
        return {
          select() {
            return {
              in() {
                return Promise.resolve({
                  data: [
                    {
                      waha_message_id: 'msg-source',
                      from_jid: null,
                      reply_to_message_id: null,
                      body_raw: 'Gate pass pending',
                      body_norm: 'gate pass pending',
                      sent_at: '2026-04-01T00:00:00.000Z',
                    },
                  ],
                  error: null,
                });
              },
            };
          },
        };
      }
      throw new Error(table);
    }

    const missingClient = {
      schema() {
        return { from };
      },
      from,
    } as unknown as SupabaseClient;

    const result = await fetchWorkItemContext(missingClient, 'wi-1');
    expect(result?.evidence.missingMessageIds).toEqual(['msg-missing']);
    expect(result?.evidence.messages).toHaveLength(1);
  });
});

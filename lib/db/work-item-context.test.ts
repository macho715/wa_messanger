import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchWorkItemContext } from './work-item-context';

describe('fetchWorkItemContext', () => {
  it('returns the safe context payload from public RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
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
      },
      error: null,
    });

    const client = { rpc } as unknown as SupabaseClient;
    const result = await fetchWorkItemContext(client, 'wi-1');

    expect(rpc).toHaveBeenCalledWith('get_work_item_context', {
      p_work_item_id: 'wi-1',
    });
    expect(result?.workItem.title).toBe('Gate pass');
    expect(result?.evidence.messages).toHaveLength(2);
  });

  it('returns null when the RPC does not find the work item', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = { rpc } as unknown as SupabaseClient;

    const result = await fetchWorkItemContext(client, 'wi-missing');

    expect(result).toBeNull();
  });
});

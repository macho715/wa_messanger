import { describe, expect, it } from 'vitest';
import { normalizeWahaEvent } from './normalize-event';

describe('normalizeWahaEvent', () => {
  it('returns null for non-group chatId', () => {
    expect(
      normalizeWahaEvent({
        event: 'message',
        data: { chatId: '123@c.us', id: 'm1', body: 'hi' },
      }),
    ).toBeNull();
  });

  it('extracts @g.us group message', () => {
    const ev = normalizeWahaEvent({
      event: 'message',
      data: {
        chatId: '120363@g.us',
        id: 'msg-1',
        body: 'please arrange gate pass',
        participant: 'p@s.whatsapp.net',
        replyTo: { id: 'msg-0' },
        timestamp: 1_700_000_000,
      },
    });
    expect(ev).not.toBeNull();
    expect(ev!.groupId).toBe('120363@g.us');
    expect(ev!.messageId).toBe('msg-1');
    expect(ev!.replyToMessageId).toBe('msg-0');
    expect(ev!.bodyRaw).toContain('gate pass');
  });
});

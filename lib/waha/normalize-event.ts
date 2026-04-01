export type NormalizedWahaEvent = {
  eventType: string;
  messageId: string;
  groupId: string;
  participantId: string | null;
  replyToMessageId: string | null;
  bodyRaw: string;
  sentAt: string | null;
  payload: unknown;
};

function normalizeTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      const ms = asNumber < 10_000_000_000 ? asNumber * 1000 : asNumber;
      return new Date(ms).toISOString();
    }
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/** Group messages only (@g.us). */
export function normalizeWahaEvent(payload: unknown): NormalizedWahaEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const eventType =
    (typeof p.event === 'string' && p.event) ||
    (typeof p.eventType === 'string' && p.eventType) ||
    (typeof p.type === 'string' && p.type) ||
    'unknown';

  const data = (p.data ?? p.payload ?? p) as Record<string, unknown>;

  const groupId =
    (typeof data.chatId === 'string' && data.chatId) ||
    (typeof (data.chat as Record<string, unknown> | undefined)?.id === 'string' &&
      String((data.chat as { id: string }).id)) ||
    (typeof data.to === 'string' && data.to) ||
    null;

  if (!groupId || !groupId.endsWith('@g.us')) return null;

  const messageId =
    (typeof data.id === 'string' && data.id) ||
    (typeof (data.message as Record<string, unknown> | undefined)?.id === 'string' &&
      String((data.message as { id: string }).id)) ||
    null;

  if (!messageId) return null;

  const participantId =
    (typeof data.participant === 'string' && data.participant) ||
    (typeof data.author === 'string' && data.author) ||
    (typeof data.from === 'string' && data.from) ||
    null;

  const replyTo = data.replyTo as Record<string, unknown> | undefined;
  const replyToMessageId =
    (replyTo && typeof replyTo.id === 'string' ? replyTo.id : null) ||
    (typeof data.replyToMessageId === 'string' ? data.replyToMessageId : null);

  const bodyRaw =
    (typeof data.body === 'string' && data.body) ||
    (typeof data.text === 'string' && data.text) ||
    (typeof data.caption === 'string' && data.caption) ||
    '';

  const sentAt = normalizeTimestamp(
    data.timestamp ?? data.sentAt ?? data.messageTimestamp,
  );

  return {
    eventType: String(eventType),
    messageId,
    groupId,
    participantId,
    replyToMessageId,
    bodyRaw,
    sentAt,
    payload,
  };
}

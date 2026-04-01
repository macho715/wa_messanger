import type { SupabaseClient } from '@supabase/supabase-js';

type SafeMeta = {
  linkageStatus?: string;
  sourceEvent?: string;
  normalizedText?: string;
  summary?: string;
  ownerName?: string;
  holdReason?: string;
  replyToMessageId?: string | null;
  keywordsHit?: string[];
  shipmentKeyCandidates?: string[];
};

export type WorkItemContextMessage = {
  messageId: string;
  matches: Array<'source' | 'reply_to'>;
  fromJid: string | null;
  replyToMessageId: string | null;
  bodyRaw: string | null;
  bodyNorm: string | null;
  sentAt: string | null;
};

export type WorkItemContext = {
  workItem: {
    id: string;
    groupId: string;
    sourceMessageId: string;
    replyToMessageId: string | null;
    title: string;
    boardState: string;
    eventStatus: string;
    ownerName: string | null;
    holdReason: string | null;
    lastMessageAt: string;
    shipmentRefId: string | null;
    meta: SafeMeta;
  };
  evidence: {
    messages: WorkItemContextMessage[];
    missingMessageIds: string[];
  };
};

type WorkItemRow = {
  id: string;
  group_id: string;
  source_message_id: string;
  reply_to_message_id: string | null;
  title: string;
  board_state: string;
  event_status: string;
  owner_name: string | null;
  hold_reason: string | null;
  last_message_at: string;
  shipment_ref_id: string | null;
  meta: unknown;
};

type WaMessageRow = {
  waha_message_id: string;
  from_jid: string | null;
  reply_to_message_id: string | null;
  body_raw: string | null;
  body_norm: string | null;
  sent_at: string | null;
};

const WORK_ITEM_SELECT =
  'id, group_id, source_message_id, reply_to_message_id, title, board_state, event_status, owner_name, hold_reason, last_message_at, shipment_ref_id, meta';
const WA_MESSAGE_SELECT =
  'waha_message_id, from_jid, reply_to_message_id, body_raw, body_norm, sent_at';

export async function fetchWorkItemContext(
  supabase: SupabaseClient,
  workItemId: string,
): Promise<WorkItemContext | null> {
  const { data: workItem, error: workItemError } = await supabase
    .from('work_item')
    .select(WORK_ITEM_SELECT)
    .eq('id', workItemId)
    .maybeSingle();

  if (workItemError) throw workItemError;
  if (!workItem) return null;

  const typedWorkItem = workItem as WorkItemRow;
  const messageAnchors = buildAnchors(typedWorkItem);

  const { data: messages, error: messageError } = await supabase
    .schema('ops_private')
    .from('wa_message')
    .select(WA_MESSAGE_SELECT)
    .in('waha_message_id', messageAnchors.ids);

  if (messageError) throw messageError;

  const rows = (messages ?? []) as WaMessageRow[];
  const byId = new Map(rows.map((row) => [row.waha_message_id, row]));
  const orderedMessages = messageAnchors.ids
    .map((messageId) => {
      const row = byId.get(messageId);
      if (!row) return null;
      return {
        messageId: row.waha_message_id,
        matches: messageAnchors.roles.get(messageId) ?? [],
        fromJid: row.from_jid,
        replyToMessageId: row.reply_to_message_id,
        bodyRaw: row.body_raw,
        bodyNorm: row.body_norm,
        sentAt: row.sent_at,
      } satisfies WorkItemContextMessage;
    })
    .filter((row): row is WorkItemContextMessage => row !== null);

  return {
    workItem: {
      id: typedWorkItem.id,
      groupId: typedWorkItem.group_id,
      sourceMessageId: typedWorkItem.source_message_id,
      replyToMessageId: typedWorkItem.reply_to_message_id,
      title: typedWorkItem.title,
      boardState: typedWorkItem.board_state,
      eventStatus: typedWorkItem.event_status,
      ownerName: typedWorkItem.owner_name,
      holdReason: typedWorkItem.hold_reason,
      lastMessageAt: typedWorkItem.last_message_at,
      shipmentRefId: typedWorkItem.shipment_ref_id,
      meta: normalizeSafeMeta(typedWorkItem.meta),
    },
    evidence: {
      messages: orderedMessages,
      missingMessageIds: messageAnchors.ids.filter((messageId) => !byId.has(messageId)),
    },
  };
}

function buildAnchors(workItem: WorkItemRow): {
  ids: string[];
  roles: Map<string, Array<'source' | 'reply_to'>>;
} {
  const ids: string[] = [];
  const roles = new Map<string, Array<'source' | 'reply_to'>>();

  const add = (messageId: string | null, role: 'source' | 'reply_to') => {
    if (!messageId) return;
    const existing = roles.get(messageId);
    if (existing) {
      if (!existing.includes(role)) existing.push(role);
      return;
    }
    ids.push(messageId);
    roles.set(messageId, [role]);
  };

  add(workItem.source_message_id, 'source');
  add(workItem.reply_to_message_id, 'reply_to');

  return { ids, roles };
}

function normalizeSafeMeta(meta: unknown): SafeMeta {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};

  const record = meta as Record<string, unknown>;
  const result: SafeMeta = {};

  const linkageStatus = asString(record.linkage_status);
  if (linkageStatus) result.linkageStatus = linkageStatus;

  const sourceEvent = asString(record.source_event);
  if (sourceEvent) result.sourceEvent = sourceEvent;

  const normalizedText = asString(record.normalized_text);
  if (normalizedText) result.normalizedText = normalizedText;

  const summary = asString(record.summary);
  if (summary) result.summary = summary;

  const ownerName = asString(record.owner_name);
  if (ownerName) result.ownerName = ownerName;

  const holdReason = asString(record.hold_reason);
  if (holdReason) result.holdReason = holdReason;

  if (Object.prototype.hasOwnProperty.call(record, 'reply_to_message_id')) {
    const replyToMessageId = asNullableString(record.reply_to_message_id);
    result.replyToMessageId = replyToMessageId;
  }

  const keywordsHit = asStringArray(record.keywords_hit);
  if (keywordsHit) result.keywordsHit = keywordsHit;

  const shipmentKeyCandidates = asStringArray(record.shipment_key_candidates);
  if (shipmentKeyCandidates) result.shipmentKeyCandidates = shipmentKeyCandidates;

  return result;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
}

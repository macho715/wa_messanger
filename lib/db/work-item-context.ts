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

export async function fetchWorkItemContext(
  supabase: SupabaseClient,
  workItemId: string,
): Promise<WorkItemContext | null> {
  const { data, error } = await supabase.rpc('get_work_item_context', {
    p_work_item_id: workItemId,
  });

  if (error) throw error;
  if (!data) return null;
  return data as WorkItemContext;
}

export type BoardState =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'HOLD'
  | 'DONE'
  | 'CANCELED';

export type EventStatus =
  | 'UNKNOWN'
  | 'REQUEST'
  | 'ASSIGNED'
  | 'ARRIVED'
  | 'STARTED'
  | 'ONGOING'
  | 'PARTIAL_DONE'
  | 'WAITING_GATE'
  | 'WAITING_DOC'
  | 'WAITING_EQUIPMENT'
  | 'WAITING_REPLY'
  | 'WAITING_WEATHER'
  | 'WAITING_APPROVAL'
  | 'DONE'
  | 'RELEASED'
  | 'CANCELED';

export type WorkItemRow = {
  id: string;
  group_id: string;
  source_message_id: string;
  reply_to_message_id: string | null;
  title: string;
  type_code: string;
  board_state: BoardState;
  event_status: EventStatus;
  owner_name: string | null;
  hold_reason: string | null;
  dedupe_key: string | null;
  priority_score: number;
  last_message_at: string;
  shipment_ref_id: string | null;
};

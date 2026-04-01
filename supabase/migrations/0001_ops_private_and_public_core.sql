create extension if not exists pgcrypto;

create schema if not exists ops_private;

revoke all on schema ops_private from public;
revoke all on schema ops_private from anon;
revoke all on schema ops_private from authenticated;

grant usage on schema ops_private to service_role;
grant all on all tables in schema ops_private to service_role;
grant all on all sequences in schema ops_private to service_role;
alter default privileges in schema ops_private grant all on tables to service_role;
alter default privileges in schema ops_private grant all on sequences to service_role;

-- Raw webhook audit (idempotent on message_id)
create table if not exists ops_private.wa_raw_event (
  message_id text primary key,
  event_type text not null,
  group_id text not null,
  participant_id text,
  reply_to_message_id text,
  body_raw text,
  payload_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_wa_raw_event_group_received
  on ops_private.wa_raw_event (group_id, received_at desc);

-- Normalized message line (optional denormalized copy for pipeline)
create table if not exists ops_private.wa_message (
  id bigserial primary key,
  waha_message_id text not null unique,
  chat_id text not null,
  from_jid text,
  reply_to_message_id text,
  body_raw text,
  body_norm text,
  sent_at timestamptz,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wa_message_chat_sent
  on ops_private.wa_message (chat_id, sent_at desc);

-- Work card: 2-layer state (v4) — board_state + event_status
create table if not exists public.work_item (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  source_message_id text not null unique,
  reply_to_message_id text,
  title text not null,
  type_code text not null,
  board_state text not null
    check (board_state in (
      'NEW', 'ASSIGNED', 'IN_PROGRESS', 'HOLD', 'DONE', 'CANCELED'
    )),
  event_status text not null default 'UNKNOWN',
  owner_name text,
  hold_reason text,
  dedupe_key text,
  priority_score numeric(5,2) not null default 0,
  last_message_at timestamptz not null,
  shipment_ref_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_work_item_dedupe
  on public.work_item (dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_work_item_group_board
  on public.work_item (group_id, board_state, last_message_at desc);

create index if not exists idx_work_item_hold
  on public.work_item (group_id, last_message_at desc)
  where board_state = 'HOLD';

create table if not exists public.work_item_status_history (
  id uuid primary key default gen_random_uuid(),
  work_item_id uuid not null references public.work_item(id) on delete cascade,
  from_board_state text,
  to_board_state text not null,
  from_event_status text,
  to_event_status text not null,
  source_message_id text not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_work_item_status_hist_item
  on public.work_item_status_history (work_item_id, changed_at desc);

create or replace function public.touch_work_item_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_work_item_updated on public.work_item;
create trigger trg_work_item_updated
  before update on public.work_item
  for each row execute function public.touch_work_item_updated_at();

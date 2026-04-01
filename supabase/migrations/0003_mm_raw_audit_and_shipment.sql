-- mm.md-style raw audit (insert-first), nullable identity until message known, + parse + shipment_ref

-- 1) wa_raw_event: surrogate PK, message_id optional for pre-parse rows
alter table ops_private.wa_raw_event add column if not exists id bigserial;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'ops_private.wa_raw_event'::regclass
      and contype = 'p'
      and conname = 'wa_raw_event_pkey'
  ) then
    alter table ops_private.wa_raw_event drop constraint wa_raw_event_pkey;
  end if;
end $$;

alter table ops_private.wa_raw_event add primary key (id);

create unique index if not exists uq_wa_raw_event_message_id
  on ops_private.wa_raw_event (message_id)
  where message_id is not null;

alter table ops_private.wa_raw_event alter column message_id drop not null;
alter table ops_private.wa_raw_event alter column event_type drop not null;
alter table ops_private.wa_raw_event alter column group_id drop not null;

alter table ops_private.wa_raw_event add column if not exists session_name text default 'default';
alter table ops_private.wa_raw_event add column if not exists raw_headers jsonb not null default '{}'::jsonb;
alter table ops_private.wa_raw_event add column if not exists hmac_digest text;
alter table ops_private.wa_raw_event add column if not exists raw_body text;
alter table ops_private.wa_raw_event add column if not exists process_status text not null default 'NEW';
alter table ops_private.wa_raw_event add column if not exists error_message text;
alter table ops_private.wa_raw_event add column if not exists processed_at timestamptz;

update ops_private.wa_raw_event
set process_status = 'DONE', processed_at = coalesce(processed_at, received_at);

-- 2) shipment lookup SSOT (before wa_message_parse FK)
create table if not exists public.shipment_ref (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  hvdc_ref text,
  sct_ship_no text,
  bl_ref text,
  ci_ref text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shipment_ref_hvdc on public.shipment_ref (hvdc_ref);
create index if not exists idx_shipment_ref_sct on public.shipment_ref (sct_ship_no);

drop trigger if exists trg_shipment_ref_updated on public.shipment_ref;
create or replace function public.touch_shipment_ref_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_shipment_ref_updated
  before update on public.shipment_ref
  for each row execute function public.touch_shipment_ref_updated_at();

alter table public.shipment_ref enable row level security;
drop policy if exists "anon_read_shipment_ref" on public.shipment_ref;
create policy "anon_read_shipment_ref" on public.shipment_ref for select to anon using (true);
drop policy if exists "authenticated_read_shipment_ref" on public.shipment_ref;
create policy "authenticated_read_shipment_ref" on public.shipment_ref for select to authenticated using (true);

-- 3) wa_message → link raw
alter table ops_private.wa_message add column if not exists raw_event_id bigint
  references ops_private.wa_raw_event(id) on delete set null;

create index if not exists idx_wa_message_raw_event on ops_private.wa_message (raw_event_id);

-- 4) parse ledger
create table if not exists ops_private.wa_message_parse (
  id bigserial primary key,
  message_id bigint not null references ops_private.wa_message(id) on delete cascade,
  parser_version text not null default 'spike',
  parser_action text not null,
  work_type text,
  event_status text,
  board_state text,
  shipment_ref_id uuid references public.shipment_ref(id) on delete set null,
  dedupe_key text,
  status_reason text,
  confidence numeric(5,2) not null default 0,
  keywords_hit text[] not null default '{}',
  extracted jsonb not null default '{}'::jsonb,
  extracted_at timestamptz not null default now(),
  unique (message_id)
);

create index if not exists idx_wa_message_parse_dedupe on ops_private.wa_message_parse (dedupe_key)
  where dedupe_key is not null;

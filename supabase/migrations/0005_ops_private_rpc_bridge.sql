-- Bridge public RPCs to ops_private so server routes do not depend on direct
-- PostgREST exposure of the ops_private schema.

create or replace function public.ops_insert_raw_event(
  p_session_name text,
  p_raw_headers jsonb,
  p_hmac_digest text,
  p_raw_body text,
  p_payload_json jsonb,
  p_body_raw text default null,
  p_process_status text default 'NEW'
)
returns bigint
language plpgsql
security definer
set search_path = public, ops_private
as $$
declare
  inserted_id bigint;
begin
  insert into ops_private.wa_raw_event (
    session_name,
    raw_headers,
    hmac_digest,
    raw_body,
    payload_json,
    body_raw,
    process_status
  )
  values (
    coalesce(p_session_name, 'default'),
    coalesce(p_raw_headers, '{}'::jsonb),
    p_hmac_digest,
    p_raw_body,
    coalesce(p_payload_json, '{}'::jsonb),
    coalesce(p_body_raw, p_raw_body),
    coalesce(p_process_status, 'NEW')
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.ops_mark_raw_event(
  p_raw_event_id bigint,
  p_status text,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public, ops_private
as $$
begin
  update ops_private.wa_raw_event
  set
    process_status = p_status,
    error_message = p_error_message,
    processed_at = now()
  where id = p_raw_event_id;
end;
$$;

create or replace function public.ops_merge_or_finalize_raw_event(
  p_preliminary_id bigint,
  p_message_id text,
  p_event_type text,
  p_group_id text,
  p_participant_id text,
  p_reply_to_message_id text,
  p_body_raw text,
  p_payload_json jsonb,
  p_sent_at timestamptz
)
returns bigint
language plpgsql
security definer
set search_path = public, ops_private
as $$
declare
  prelim ops_private.wa_raw_event%rowtype;
  winner_id bigint;
begin
  select *
  into prelim
  from ops_private.wa_raw_event
  where id = p_preliminary_id;

  if not found then
    raise exception 'wa_raw_event % not found', p_preliminary_id;
  end if;

  select id
  into winner_id
  from ops_private.wa_raw_event
  where message_id = p_message_id
    and id <> p_preliminary_id
  order by id
  limit 1;

  if winner_id is not null then
    update ops_private.wa_raw_event
    set
      message_id = p_message_id,
      event_type = p_event_type,
      group_id = p_group_id,
      participant_id = p_participant_id,
      reply_to_message_id = p_reply_to_message_id,
      body_raw = p_body_raw,
      payload_json = coalesce(p_payload_json, '{}'::jsonb),
      sent_at = p_sent_at,
      raw_headers = coalesce(prelim.raw_headers, raw_headers),
      hmac_digest = coalesce(prelim.hmac_digest, hmac_digest),
      raw_body = coalesce(prelim.raw_body, raw_body)
    where id = winner_id;

    delete from ops_private.wa_raw_event where id = p_preliminary_id;
    return winner_id;
  end if;

  begin
    update ops_private.wa_raw_event
    set
      message_id = p_message_id,
      event_type = p_event_type,
      group_id = p_group_id,
      participant_id = p_participant_id,
      reply_to_message_id = p_reply_to_message_id,
      body_raw = p_body_raw,
      payload_json = coalesce(p_payload_json, '{}'::jsonb),
      sent_at = p_sent_at
    where id = p_preliminary_id;

    return p_preliminary_id;
  exception
    when unique_violation then
      select id
      into winner_id
      from ops_private.wa_raw_event
      where message_id = p_message_id
      order by id
      limit 1;

      if winner_id is null then
        raise;
      end if;

      update ops_private.wa_raw_event
      set
        message_id = p_message_id,
        event_type = p_event_type,
        group_id = p_group_id,
        participant_id = p_participant_id,
        reply_to_message_id = p_reply_to_message_id,
        body_raw = p_body_raw,
        payload_json = coalesce(p_payload_json, '{}'::jsonb),
        sent_at = p_sent_at,
        raw_headers = coalesce(prelim.raw_headers, raw_headers),
        hmac_digest = coalesce(prelim.hmac_digest, hmac_digest),
        raw_body = coalesce(prelim.raw_body, raw_body)
      where id = winner_id;

      if winner_id <> p_preliminary_id then
        delete from ops_private.wa_raw_event where id = p_preliminary_id;
      end if;

      return winner_id;
  end;
end;
$$;

create or replace function public.ops_upsert_wa_message(
  p_waha_message_id text,
  p_chat_id text,
  p_from_jid text,
  p_reply_to_message_id text,
  p_body_raw text,
  p_body_norm text,
  p_sent_at timestamptz,
  p_payload_json jsonb,
  p_raw_event_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, ops_private
as $$
declare
  out_id bigint;
begin
  insert into ops_private.wa_message (
    waha_message_id,
    chat_id,
    from_jid,
    reply_to_message_id,
    body_raw,
    body_norm,
    sent_at,
    payload_json,
    raw_event_id
  )
  values (
    p_waha_message_id,
    p_chat_id,
    p_from_jid,
    p_reply_to_message_id,
    p_body_raw,
    p_body_norm,
    p_sent_at,
    coalesce(p_payload_json, '{}'::jsonb),
    p_raw_event_id
  )
  on conflict (waha_message_id) do update
  set
    chat_id = excluded.chat_id,
    from_jid = excluded.from_jid,
    reply_to_message_id = excluded.reply_to_message_id,
    body_raw = excluded.body_raw,
    body_norm = excluded.body_norm,
    sent_at = excluded.sent_at,
    payload_json = excluded.payload_json,
    raw_event_id = excluded.raw_event_id
  returning id into out_id;

  return out_id;
end;
$$;

create or replace function public.ops_upsert_wa_message_parse(
  p_message_id bigint,
  p_parser_version text,
  p_parser_action text,
  p_work_type text,
  p_event_status text,
  p_board_state text,
  p_shipment_ref_id uuid,
  p_dedupe_key text,
  p_status_reason text,
  p_confidence numeric,
  p_keywords_hit text[],
  p_extracted jsonb
)
returns void
language plpgsql
security definer
set search_path = public, ops_private
as $$
begin
  insert into ops_private.wa_message_parse (
    message_id,
    parser_version,
    parser_action,
    work_type,
    event_status,
    board_state,
    shipment_ref_id,
    dedupe_key,
    status_reason,
    confidence,
    keywords_hit,
    extracted
  )
  values (
    p_message_id,
    coalesce(p_parser_version, 'spike-mm'),
    p_parser_action,
    p_work_type,
    p_event_status,
    p_board_state,
    p_shipment_ref_id,
    p_dedupe_key,
    p_status_reason,
    coalesce(p_confidence, 0),
    coalesce(p_keywords_hit, '{}'::text[]),
    coalesce(p_extracted, '{}'::jsonb)
  )
  on conflict (message_id) do update
  set
    parser_version = excluded.parser_version,
    parser_action = excluded.parser_action,
    work_type = excluded.work_type,
    event_status = excluded.event_status,
    board_state = excluded.board_state,
    shipment_ref_id = excluded.shipment_ref_id,
    dedupe_key = excluded.dedupe_key,
    status_reason = excluded.status_reason,
    confidence = excluded.confidence,
    keywords_hit = excluded.keywords_hit,
    extracted = excluded.extracted,
    extracted_at = now();
end;
$$;

create or replace function public.get_work_item_context(p_work_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, ops_private
as $$
declare
  wi public.work_item%rowtype;
  messages_json jsonb := '[]'::jsonb;
  missing_ids text[] := '{}'::text[];
begin
  select *
  into wi
  from public.work_item
  where id = p_work_item_id;

  if not found then
    return null;
  end if;

  with anchors as (
    select wi.source_message_id as message_id, 'source'::text as role, 1 as ord
    union all
    select wi.reply_to_message_id as message_id, 'reply_to'::text as role, 2 as ord
    where wi.reply_to_message_id is not null
      and wi.reply_to_message_id <> wi.source_message_id
  ),
  grouped as (
    select message_id, array_agg(role order by ord) as roles, min(ord) as ord
    from anchors
    where message_id is not null
    group by message_id
  ),
  joined as (
    select
      g.message_id,
      g.roles,
      g.ord,
      m.waha_message_id,
      m.from_jid,
      m.reply_to_message_id,
      m.body_raw,
      m.body_norm,
      m.sent_at
    from grouped g
    left join ops_private.wa_message m
      on m.waha_message_id = g.message_id
    order by g.ord
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'messageId', waha_message_id,
          'matches', to_jsonb(roles),
          'fromJid', from_jid,
          'replyToMessageId', reply_to_message_id,
          'bodyRaw', body_raw,
          'bodyNorm', body_norm,
          'sentAt', sent_at
        )
        order by ord
      ) filter (where waha_message_id is not null),
      '[]'::jsonb
    ),
    coalesce(
      array_agg(message_id order by ord) filter (where waha_message_id is null),
      '{}'::text[]
    )
  into messages_json, missing_ids
  from joined;

  return jsonb_build_object(
    'workItem',
    jsonb_build_object(
      'id', wi.id,
      'groupId', wi.group_id,
      'sourceMessageId', wi.source_message_id,
      'replyToMessageId', wi.reply_to_message_id,
      'title', wi.title,
      'boardState', wi.board_state,
      'eventStatus', wi.event_status,
      'ownerName', wi.owner_name,
      'holdReason', wi.hold_reason,
      'lastMessageAt', wi.last_message_at,
      'shipmentRefId', wi.shipment_ref_id,
      'meta', jsonb_strip_nulls(
        jsonb_build_object(
          'linkageStatus', wi.meta->>'linkage_status',
          'sourceEvent', wi.meta->>'source_event',
          'normalizedText', wi.meta->>'normalized_text',
          'summary', wi.meta->>'summary',
          'ownerName', wi.meta->>'owner_name',
          'holdReason', wi.meta->>'hold_reason',
          'replyToMessageId', wi.meta->>'reply_to_message_id',
          'keywordsHit', coalesce(wi.meta->'keywords_hit', '[]'::jsonb),
          'shipmentKeyCandidates', coalesce(wi.meta->'shipment_key_candidates', '[]'::jsonb)
        )
      )
    ),
    'evidence',
    jsonb_build_object(
      'messages', messages_json,
      'missingMessageIds', to_jsonb(missing_ids)
    )
  );
end;
$$;

revoke all on function public.ops_insert_raw_event(text, jsonb, text, text, jsonb, text, text) from public;
revoke all on function public.ops_mark_raw_event(bigint, text, text) from public;
revoke all on function public.ops_merge_or_finalize_raw_event(bigint, text, text, text, text, text, text, jsonb, timestamptz) from public;
revoke all on function public.ops_upsert_wa_message(text, text, text, text, text, text, timestamptz, jsonb, bigint) from public;
revoke all on function public.ops_upsert_wa_message_parse(bigint, text, text, text, text, text, uuid, text, text, numeric, text[], jsonb) from public;
revoke all on function public.get_work_item_context(uuid) from public;

grant execute on function public.ops_insert_raw_event(text, jsonb, text, text, jsonb, text, text) to service_role;
grant execute on function public.ops_mark_raw_event(bigint, text, text) to service_role;
grant execute on function public.ops_merge_or_finalize_raw_event(bigint, text, text, text, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.ops_upsert_wa_message(text, text, text, text, text, text, timestamptz, jsonb, bigint) to service_role;
grant execute on function public.ops_upsert_wa_message_parse(bigint, text, text, text, text, text, uuid, text, text, numeric, text[], jsonb) to service_role;
grant execute on function public.get_work_item_context(uuid) to service_role;

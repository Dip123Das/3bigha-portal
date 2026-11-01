begin;

/* MOB-54 — Immutable party correction notes bound to one current draft. */

create table if not exists
  public.property_unit_booking_agreement_draft_party_feedback (
    id uuid primary key default gen_random_uuid(),
    draft_id uuid not null
      references public.property_unit_booking_agreement_drafts(id)
      on delete restrict,
    readiness_id uuid not null
      references public.property_unit_booking_agreement_readiness(id)
      on delete restrict,
    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,
    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,
    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,
    actor_user_id uuid not null
      references auth.users(id)
      on delete restrict,
    actor_role text not null
      check (actor_role in ('buyer', 'owner')),
    reply_to_feedback_id uuid
      references
        public.property_unit_booking_agreement_draft_party_feedback(id)
      on delete restrict,
    draft_content_sha256 text not null
      check (draft_content_sha256 ~ '^[0-9a-f]{64}$'),
    note_sha256 text not null
      check (note_sha256 ~ '^[0-9a-f]{64}$'),
    note_text text not null
      check (char_length(btrim(note_text)) between 1 and 2000),
    created_at timestamptz not null default now()
  );

create unique index if not exists
  property_agreement_draft_party_feedback_unique
on public.property_unit_booking_agreement_draft_party_feedback (
  draft_id,
  actor_user_id,
  draft_content_sha256,
  note_sha256,
  coalesce(
    reply_to_feedback_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  )
);

create index if not exists
  property_agreement_draft_party_feedback_readiness_idx
on public.property_unit_booking_agreement_draft_party_feedback(
  readiness_id,
  created_at desc
);

alter table
  public.property_unit_booking_agreement_draft_party_feedback
  enable row level security;
revoke all on
  public.property_unit_booking_agreement_draft_party_feedback
from public, anon, authenticated, service_role;
grant select on
  public.property_unit_booking_agreement_draft_party_feedback
to service_role;

alter table public.property_unit_booking_agreement_draft_events
  drop constraint if exists
    property_unit_booking_agreement_draft_events_event_kind_check;
alter table public.property_unit_booking_agreement_draft_events
  add constraint property_unit_booking_agreement_draft_events_event_kind_check
  check (event_kind in (
    'generation_requested',
    'source_bound',
    'source_opened_for_generation',
    'generation_started',
    'draft_generated',
    'generation_failed',
    'lawyer_review_requested',
    'lawyer_review_started',
    'lawyer_changes_requested',
    'party_review_acknowledged',
    'party_feedback_submitted',
    'draft_superseded',
    'draft_cancelled'
  ));

create or replace function
  public.record_property_unit_booking_agreement_draft_party_feedback(
    target_actor_user_id uuid,
    target_readiness_id uuid,
    target_draft_id uuid,
    target_draft_content_sha256 text,
    target_note_text text,
    target_reply_to_feedback_id uuid default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  draft_record
    public.property_unit_booking_agreement_drafts%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  feedback_record
    public.property_unit_booking_agreement_draft_party_feedback%rowtype;
  parent_feedback_record
    public.property_unit_booking_agreement_draft_party_feedback%rowtype;
  actor_role_value text;
  normalized_note text := nullif(btrim(target_note_text), '');
  note_sha256_value text;
  created_value boolean := false;
  source_inspection jsonb;
  action_time timestamptz := clock_timestamp();
begin
  if target_actor_user_id is null
     or target_readiness_id is null
     or target_draft_id is null
     or target_draft_content_sha256 is null
     or target_draft_content_sha256 !~ '^[0-9a-f]{64}$'
     or normalized_note is null
     or char_length(normalized_note) > 2000 then
    raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_INPUT_INVALID'
      using errcode = '22023';
  end if;

  source_inspection :=
    public.inspect_property_unit_booking_agreement_draft_sources(
      target_actor_user_id,
      target_readiness_id,
      target_draft_id
    );

  if source_inspection->>'sourceStatus' <> 'current' then
    raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_SOURCE_STALE'
      using errcode = '23514';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id
    and draft.readiness_id = target_readiness_id
  for update;

  if not found then
    raise exception 'AGREEMENT_DRAFT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if draft_record.status not in (
       'generated', 'lawyer_review_pending', 'lawyer_changes_requested'
     )
     or draft_record.draft_content_json is null
     or draft_record.draft_content_sha256
       <> target_draft_content_sha256 then
    raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_VERSION_CONFLICT'
      using errcode = '23505';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = draft_record.readiness_id;

  if not found
     or readiness_record.application_id <> draft_record.application_id
     or readiness_record.unit_id <> draft_record.unit_id
     or readiness_record.project_id <> draft_record.project_id
     or readiness_record.property_schedule_confirmed_at is null then
    raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if target_actor_user_id = readiness_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_FORBIDDEN'
      using errcode = '42501';
  end if;

  if target_reply_to_feedback_id is not null then
    select feedback.*
    into parent_feedback_record
    from public.property_unit_booking_agreement_draft_party_feedback feedback
    where feedback.id = target_reply_to_feedback_id;

    if not found
       or parent_feedback_record.draft_id <> draft_record.id
       or parent_feedback_record.readiness_id <> draft_record.readiness_id
       or parent_feedback_record.draft_content_sha256
         <> target_draft_content_sha256
       or parent_feedback_record.reply_to_feedback_id is not null then
      raise exception 'AGREEMENT_DRAFT_PARTY_FEEDBACK_REPLY_INVALID'
        using errcode = '23514';
    end if;
  end if;

  note_sha256_value := encode(
    extensions.digest(convert_to(normalized_note, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.property_unit_booking_agreement_draft_party_feedback (
    draft_id,
    readiness_id,
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    actor_role,
    reply_to_feedback_id,
    draft_content_sha256,
    note_sha256,
    note_text,
    created_at
  ) values (
    draft_record.id,
    draft_record.readiness_id,
    draft_record.application_id,
    draft_record.unit_id,
    draft_record.project_id,
    target_actor_user_id,
    actor_role_value,
    target_reply_to_feedback_id,
    target_draft_content_sha256,
    note_sha256_value,
    normalized_note,
    action_time
  )
  on conflict do nothing
  returning * into feedback_record;

  if found then
    created_value := true;
    insert into public.property_unit_booking_agreement_draft_events (
      draft_id,
      readiness_id,
      application_id,
      unit_id,
      project_id,
      actor_user_id,
      actor_role,
      event_kind,
      previous_status,
      next_status,
      metadata,
      created_at
    ) values (
      draft_record.id,
      draft_record.readiness_id,
      draft_record.application_id,
      draft_record.unit_id,
      draft_record.project_id,
      target_actor_user_id,
      actor_role_value,
      'party_feedback_submitted',
      draft_record.status,
      draft_record.status,
      jsonb_build_object(
        'draftContentSha256', target_draft_content_sha256,
        'noteSha256', note_sha256_value,
        'replyToFeedbackId', target_reply_to_feedback_id,
        'createdAt', action_time
      ),
      action_time
    );
  else
    select feedback.*
    into feedback_record
    from public.property_unit_booking_agreement_draft_party_feedback feedback
    where feedback.draft_id = draft_record.id
      and feedback.actor_user_id = target_actor_user_id
      and feedback.draft_content_sha256 = target_draft_content_sha256
      and feedback.note_sha256 = note_sha256_value
      and feedback.reply_to_feedback_id
        is not distinct from target_reply_to_feedback_id;
  end if;

  return jsonb_build_object(
    'feedbackId', feedback_record.id,
    'replyToFeedbackId', feedback_record.reply_to_feedback_id,
    'draftId', feedback_record.draft_id,
    'readinessId', feedback_record.readiness_id,
    'actorRole', feedback_record.actor_role,
    'draftContentSha256', feedback_record.draft_content_sha256,
    'noteText', feedback_record.note_text,
    'createdAt', feedback_record.created_at,
    'created', created_value,
    'legalApproval', false,
    'draftChanged', false
  );
end;
$$;

revoke all on function
  public.record_property_unit_booking_agreement_draft_party_feedback(
    uuid, uuid, uuid, text, text, uuid
  )
from public, anon, authenticated;
grant execute on function
  public.record_property_unit_booking_agreement_draft_party_feedback(
    uuid, uuid, uuid, text, text, uuid
  )
to service_role;

comment on table
  public.property_unit_booking_agreement_draft_party_feedback
is
  'Immutable buyer/owner correction notes bound to one current, source-verified advisory draft version. Notes do not edit or approve the draft.';

commit;

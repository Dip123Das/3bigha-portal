begin;

/* MOB-51 — Version-specific, non-binding review acknowledgement by each party. */

create table if not exists
  public.property_unit_booking_agreement_draft_party_reviews (
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
    draft_content_sha256 text not null
      check (draft_content_sha256 ~ '^[0-9a-f]{64}$'),
    reviewed_at timestamptz not null default now(),
    constraint property_agreement_draft_party_review_unique
      unique (draft_id, actor_user_id)
  );

create index if not exists
  property_agreement_draft_party_reviews_readiness_idx
on public.property_unit_booking_agreement_draft_party_reviews(
  readiness_id,
  reviewed_at desc
);

alter table public.property_unit_booking_agreement_draft_party_reviews
  enable row level security;
revoke all on
  public.property_unit_booking_agreement_draft_party_reviews
from public, anon, authenticated, service_role;
grant select, insert on
  public.property_unit_booking_agreement_draft_party_reviews
 to service_role;

alter table public.property_unit_booking_agreement_draft_events
  drop constraint if exists property_unit_booking_agreement_draft_events_event_kind_check;
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
    'draft_superseded',
    'draft_cancelled'
  ));

create or replace function
  public.record_property_unit_booking_agreement_draft_party_review(
    target_actor_user_id uuid,
    target_draft_id uuid,
    target_readiness_id uuid,
    target_draft_content_sha256 text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  draft_record public.property_unit_booking_agreement_drafts%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  actor_role_value text;
  review_record
    public.property_unit_booking_agreement_draft_party_reviews%rowtype;
  created_value boolean := false;
  review_time timestamptz := clock_timestamp();
begin
  if target_actor_user_id is null
     or target_draft_id is null
     or target_readiness_id is null
     or target_draft_content_sha256 is null
     or target_draft_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_INPUT_INVALID'
      using errcode = '22023';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id
  for update;

  if not found then
    raise exception 'AGREEMENT_DRAFT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if draft_record.readiness_id <> target_readiness_id then
    raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if draft_record.status not in (
       'generated', 'lawyer_review_pending', 'lawyer_changes_requested'
     )
     or draft_record.draft_content_json is null
     or draft_record.draft_content_sha256
       <> target_draft_content_sha256 then
    raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_VERSION_CONFLICT'
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
    raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if target_actor_user_id = readiness_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_FORBIDDEN'
      using errcode = '42501';
  end if;

  insert into public.property_unit_booking_agreement_draft_party_reviews (
    draft_id,
    readiness_id,
    application_id,
    unit_id,
    project_id,
    actor_user_id,
    actor_role,
    draft_content_sha256,
    reviewed_at
  ) values (
    draft_record.id,
    draft_record.readiness_id,
    draft_record.application_id,
    draft_record.unit_id,
    draft_record.project_id,
    target_actor_user_id,
    actor_role_value,
    target_draft_content_sha256,
    review_time
  )
  on conflict (draft_id, actor_user_id) do nothing
  returning * into review_record;

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
      'party_review_acknowledged',
      draft_record.status,
      draft_record.status,
      jsonb_build_object(
        'draftContentSha256', target_draft_content_sha256,
        'reviewedAt', review_time
      ),
      review_time
    );
  else
    select review.*
    into review_record
    from public.property_unit_booking_agreement_draft_party_reviews review
    where review.draft_id = draft_record.id
      and review.actor_user_id = target_actor_user_id;

    if not found
       or review_record.draft_content_sha256
         <> target_draft_content_sha256 then
      raise exception 'AGREEMENT_DRAFT_PARTY_REVIEW_VERSION_CONFLICT'
        using errcode = '23505';
    end if;
  end if;

  return jsonb_build_object(
    'draftId', review_record.draft_id,
    'readinessId', review_record.readiness_id,
    'actorRole', review_record.actor_role,
    'draftContentSha256', review_record.draft_content_sha256,
    'reviewedAt', review_record.reviewed_at,
    'created', created_value
  );
end;
$$;

revoke all on function
  public.record_property_unit_booking_agreement_draft_party_review(
    uuid, uuid, uuid, text
  )
from public, anon, authenticated;
grant execute on function
  public.record_property_unit_booking_agreement_draft_party_review(
    uuid, uuid, uuid, text
  )
to service_role;

comment on function
  public.record_property_unit_booking_agreement_draft_party_review(
    uuid, uuid, uuid, text
  )
is
  'Records an idempotent, version-specific acknowledgement that a bound buyer or owner reviewed the AI-assisted advisory draft. It is not legal approval, consent to sign, payment authorization, or agreement execution.';

commit;

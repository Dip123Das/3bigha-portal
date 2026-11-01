begin;

/* MOB-53 — Supersede a stale draft and prepare a fresh advisory version. */

create or replace function
  public.reconcile_property_unit_booking_agreement_draft(
    target_actor_user_id uuid,
    target_readiness_id uuid,
    target_draft_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  draft_record
    public.property_unit_booking_agreement_drafts%rowtype;
  replacement_record
    public.property_unit_booking_agreement_drafts%rowtype;
  reconciliation_event
    public.property_unit_booking_agreement_draft_events%rowtype;
  inspection_result jsonb;
  prepared_result jsonb;
  actor_role_value text;
  action_time timestamptz := clock_timestamp();
  inspection_status text;
begin
  if target_actor_user_id is null
     or target_readiness_id is null
     or target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_RECONCILIATION_INPUT_INVALID'
      using errcode = '22023';
  end if;

  /*
   * The inspector locks inventory, application, readiness and draft in the
   * canonical order, verifies party binding, then reuses the source authority.
   */
  inspection_result :=
    public.inspect_property_unit_booking_agreement_draft_sources(
      target_actor_user_id,
      target_readiness_id,
      target_draft_id
    );
  inspection_status := inspection_result->>'sourceStatus';

  if inspection_status = 'unavailable' then
    select event.*
    into reconciliation_event
    from public.property_unit_booking_agreement_draft_events event
    where event.draft_id = target_draft_id
      and event.readiness_id = target_readiness_id
      and event.actor_user_id = target_actor_user_id
      and event.event_kind = 'draft_superseded'
      and event.metadata->>'reason' = 'canonical_source_changed'
      and nullif(event.metadata->>'replacementDraftId', '') is not null
    order by event.created_at desc
    limit 1;

    if found then
      select draft.*
      into replacement_record
      from public.property_unit_booking_agreement_drafts draft
      where draft.id =
        (reconciliation_event.metadata->>'replacementDraftId')::uuid
        and draft.readiness_id = target_readiness_id
        and draft.application_id = reconciliation_event.application_id
        and draft.unit_id = reconciliation_event.unit_id
        and draft.project_id = reconciliation_event.project_id;

      if found and replacement_record.version =
          (reconciliation_event.metadata->>'replacementVersion')::integer then
        return jsonb_build_object(
          'oldDraftId', target_draft_id,
          'draftId', replacement_record.id,
          'readinessId', target_readiness_id,
          'status', replacement_record.status,
          'version', replacement_record.version,
          'supersededAt', reconciliation_event.created_at,
          'advisoryOnly', true,
          'lawyerReviewRequired', true,
          'legalEffectCreated', false,
          'signingAllowed', false,
          'registrationAllowed', false,
          'executionAllowed', false,
          'createsPayment', false,
          'marksInventorySold', false,
          'transfersTitle', false,
          'transfersOwnership', false
        );
      end if;
    end if;
  end if;

  if inspection_status = 'current' then
    raise exception 'AGREEMENT_DRAFT_SOURCE_STILL_CURRENT'
      using errcode = '23514';
  end if;

  if inspection_status <> 'changed' then
    raise exception 'AGREEMENT_DRAFT_SOURCE_RECONCILIATION_UNAVAILABLE'
      using errcode = '23514';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id;

  if target_actor_user_id = readiness_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_DRAFT_SOURCE_INSPECTION_FORBIDDEN'
      using errcode = '42501';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id
    and draft.readiness_id = target_readiness_id
  for update;

  if not found
     or draft_record.status not in (
       'generated', 'lawyer_review_pending', 'lawyer_changes_requested'
     )
     or draft_record.draft_content_json is null
     or draft_record.superseded_at is not null then
    raise exception 'AGREEMENT_DRAFT_SOURCE_RECONCILIATION_UNAVAILABLE'
      using errcode = '23514';
  end if;

  update public.property_unit_booking_agreement_drafts
  set status = 'superseded',
      superseded_at = action_time,
      updated_at = action_time
  where id = draft_record.id
    and status = draft_record.status
    and superseded_at is null;

  if not found then
    raise exception 'AGREEMENT_DRAFT_SOURCE_RECONCILIATION_CONFLICT'
      using errcode = '40001';
  end if;

  /* If canonical sources are not reconfirmed, this raises and rolls back the
     supersede update and event with the same transaction. */
  prepared_result :=
    public.prepare_property_unit_booking_agreement_advisory_draft(
      target_actor_user_id,
      target_readiness_id
    );

  if nullif(prepared_result->>'draftId', '') is null
     or prepared_result->>'status' <> 'generation_pending'
     or (prepared_result->>'version')::integer
       <= draft_record.version then
    raise exception 'AGREEMENT_DRAFT_REPLACEMENT_INVALID'
      using errcode = '23514';
  end if;

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
    'draft_superseded',
    draft_record.status,
    'superseded',
    jsonb_build_object(
      'reason', 'canonical_source_changed',
      'supersededAt', action_time,
      'replacementDraftId', prepared_result->>'draftId',
      'replacementVersion', (prepared_result->>'version')::integer
    ),
    action_time
  );

  return jsonb_build_object(
    'oldDraftId', draft_record.id,
    'draftId', prepared_result->>'draftId',
    'readinessId', target_readiness_id,
    'status', prepared_result->>'status',
    'version', (prepared_result->>'version')::integer,
    'supersededAt', action_time,
    'advisoryOnly', true,
    'lawyerReviewRequired', true,
    'legalEffectCreated', false,
    'signingAllowed', false,
    'registrationAllowed', false,
    'executionAllowed', false,
    'createsPayment', false,
    'marksInventorySold', false,
    'transfersTitle', false,
    'transfersOwnership', false
  );
end;
$$;

revoke all on function
  public.reconcile_property_unit_booking_agreement_draft(
    uuid, uuid, uuid
  )
from public, anon, authenticated;
grant execute on function
  public.reconcile_property_unit_booking_agreement_draft(
    uuid, uuid, uuid
  )
to service_role;

comment on function
  public.reconcile_property_unit_booking_agreement_draft(
    uuid, uuid, uuid
  )
is
  'Supersedes a source-stale generated advisory draft and prepares a replacement from currently confirmed canonical sources in one transaction. It creates no legal approval, signature, payment, sale, registration, or ownership change.';

commit;

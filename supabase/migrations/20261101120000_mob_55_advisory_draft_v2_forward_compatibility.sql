begin;

/* MOB-55 — Forward-only advisory-draft v2 and no approval state. */

do $migration$
declare
  function_definition text;
  prepare_function regprocedure;
begin
  if exists (
    select 1
    from public.property_unit_booking_agreement_drafts
    where status = 'lawyer_approved'
  ) then
    raise exception
      'MOB55_LEGACY_LAWYER_APPROVED_DRAFTS_REQUIRE_REVIEW';
  end if;

  if exists (
    select 1
    from public.property_unit_booking_agreement_draft_events
    where event_kind = 'lawyer_approved'
  ) then
    raise exception
      'MOB55_LEGACY_LAWYER_APPROVAL_EVENTS_REQUIRE_REVIEW';
  end if;

  if exists (
    select 1
    from public.property_unit_booking_agreement_readiness
    where status = 'approved_for_execution'
  ) or exists (
    select 1
    from public.property_unit_booking_agreement_events
    where event_kind = 'approved_for_execution'
  ) then
    raise exception
      'MOB55_LEGACY_EXECUTION_APPROVAL_STATES_REQUIRE_REVIEW';
  end if;

  prepare_function := to_regprocedure(
    'public.prepare_property_unit_booking_agreement_advisory_draft(uuid,uuid)'
  );

  if prepare_function is null then
    raise exception 'MOB55_ADVISORY_PREPARATION_AUTHORITY_NOT_FOUND';
  end if;

  function_definition := pg_get_functiondef(prepare_function);

  if position('property-agreement-ai-draft-v1' in function_definition) = 0 then
    raise exception 'MOB55_UNEXPECTED_ADVISORY_PREPARATION_VERSION';
  end if;

  function_definition := replace(
    function_definition,
    'property-agreement-ai-draft-v1',
    'property-agreement-ai-draft-v2'
  );

  if position('property-agreement-ai-draft-v1' in function_definition) > 0 then
    raise exception 'MOB55_ADVISORY_PREPARATION_VERSION_REWRITE_FAILED';
  end if;

  execute function_definition;
end;
$migration$;

alter table public.property_unit_booking_agreement_drafts
  alter column prompt_version
    set default 'property-agreement-ai-draft-v2';

alter table public.property_unit_booking_agreement_drafts
  drop constraint if exists
    property_unit_booking_agreement_drafts_status_check,
  add constraint property_unit_booking_agreement_drafts_status_check
    check (status in (
      'generation_pending',
      'generated',
      'lawyer_review_pending',
      'lawyer_changes_requested',
      'superseded',
      'cancelled',
      'generation_failed'
    )),
  drop constraint if exists
    property_unit_booking_agreement_drafts_prompt_version_check,
  add constraint property_unit_booking_agreement_drafts_prompt_version_check
    check (prompt_version in (
      'property-agreement-ai-draft-v1',
      'property-agreement-ai-draft-v2'
    )),
  drop constraint if exists property_agreement_generated_content_required,
  add constraint property_agreement_generated_content_required
    check (
      status not in (
        'generated',
        'lawyer_review_pending',
        'lawyer_changes_requested',
        'superseded'
      )
      or (
        draft_content_json is not null
        and jsonb_typeof(draft_content_json) = 'object'
        and nullif(btrim(printable_text), '') is not null
        and draft_content_sha256 is not null
        and nullif(btrim(ai_provider), '') is not null
        and nullif(btrim(ai_model), '') is not null
        and generated_at is not null
      )
    ),
  drop constraint if exists property_agreement_lawyer_review_fields,
  add constraint property_agreement_lawyer_review_fields
    check (
      status <> 'lawyer_changes_requested'
      or (
        lawyer_reviewer_user_id is not null
        and lawyer_review_started_at is not null
        and lawyer_reviewed_at is not null
      )
    ),
  drop constraint if exists property_agreement_approval_fields;

alter table public.property_unit_booking_agreement_draft_events
  drop constraint if exists
    property_unit_booking_agreement_draft_events_event_kind_check,
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

alter table public.property_unit_booking_agreement_readiness
  drop constraint if exists
    property_unit_booking_agreement_readiness_status_check,
  add constraint property_unit_booking_agreement_readiness_status_check
    check (status in (
      'collecting_details',
      'ready_for_draft',
      'draft_generated',
      'parties_reviewing',
      'changes_requested',
      'cancelled',
      'expired'
    ));

alter table public.property_unit_booking_agreement_events
  drop constraint if exists
    property_unit_booking_agreement_events_event_kind_check,
  add constraint property_unit_booking_agreement_events_event_kind_check
    check (event_kind in (
      'readiness_created',
      'buyer_details_submitted',
      'owner_details_submitted',
      'buyer_details_confirmed',
      'owner_details_confirmed',
      'property_schedule_confirmed',
      'print_layout_updated',
      'ready_for_draft',
      'draft_generated',
      'draft_viewed',
      'changes_requested',
      'readiness_cancelled',
      'readiness_expired'
    ));

comment on column
  public.property_unit_booking_agreement_drafts.approved_at
is
  'Legacy compatibility column only. This advisory workflow does not record legal approval.';

comment on function
  public.update_property_unit_booking_agreement_print_layout(
    uuid, uuid, text, numeric, numeric, numeric, numeric, numeric, numeric,
    text, numeric, numeric, boolean, boolean, boolean, boolean
  )
is
  'Updates the private, owner-bound print layout before schedule confirmation. It does not approve, execute, sign or register an agreement.';

comment on function
  public.prepare_property_unit_booking_agreement_advisory_draft(uuid, uuid)
is
  'Creates an idempotent advisory-only draft and binds canonical sources. Prompt version v2. It does not record legal approval, signing, registration, execution, payment, sale, or ownership transfer.';

commit;

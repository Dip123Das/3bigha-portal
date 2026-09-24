/*
 * MOB-37: Canonical advisory agreement-generation failure.
 *
 * A trusted worker records a bounded, non-sensitive failure code for an
 * already-claimed generation. The readiness workspace remains ready_for_draft,
 * allowing a separately prepared later version.
 *
 * No prompt, model response, document content, exception text, credential or
 * storage locator is persisted by this authority.
 */

create or replace function
  public.fail_property_unit_booking_agreement_advisory_generation (
    target_draft_id uuid,
    target_ai_request_reference text,
    target_failure_code text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  draft_preview
    public.property_unit_booking_agreement_drafts%rowtype;

  unit_record public.builder_inventory_units%rowtype;
  application_record
    public.property_unit_booking_applications%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;
  draft_record
    public.property_unit_booking_agreement_drafts%rowtype;
  failed_draft
    public.property_unit_booking_agreement_drafts%rowtype;

  normalized_request_reference text :=
    nullif(btrim(target_ai_request_reference), '');
  normalized_failure_code text :=
    upper(nullif(btrim(target_failure_code), ''));

  action_time timestamptz := now();
  replayed_value boolean := false;
begin
  if target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_REQUIRED'
      using errcode = '22023';
  end if;

  if normalized_request_reference is null
     or char_length(normalized_request_reference) > 200 then
    raise exception 'AGREEMENT_AI_REQUEST_REFERENCE_INVALID'
      using errcode = '22023';
  end if;

  if normalized_failure_code is null
     or normalized_failure_code !~ '^[A-Z0-9_]{3,80}$' then
    raise exception 'AGREEMENT_GENERATION_FAILURE_CODE_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve the unit without locking. The canonical lock sequence begins
   * with the inventory unit.
   */
  select draft.*
  into draft_preview
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id;

  if draft_preview.id is null then
    raise exception 'AGREEMENT_DRAFT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select unit.*
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = draft_preview.unit_id
  for update;

  if unit_record.id is null then
    raise exception 'PROPERTY_UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = draft_preview.application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = draft_preview.readiness_id
  for update;

  if readiness_record.id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select draft.*
  into draft_record
  from public.property_unit_booking_agreement_drafts draft
  where draft.id = target_draft_id
  for update;

  if draft_record.id is null then
    raise exception 'AGREEMENT_DRAFT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  /*
   * Failure recording remains possible after a surrounding property-state
   * change, but the immutable identities must still be canonical.
   */
  if draft_record.readiness_id <> readiness_record.id
     or draft_record.application_id <> application_record.id
     or draft_record.hold_id <> readiness_record.hold_id
     or draft_record.unit_id <> unit_record.id
     or draft_record.project_id <> unit_record.project_id
     or draft_record.project_id <> readiness_record.project_id
     or draft_record.buyer_user_id
       <> readiness_record.buyer_user_id
     or draft_record.owner_user_id
       <> readiness_record.owner_user_id
     or readiness_record.buyer_user_id
       <> application_record.buyer_user_id
     or readiness_record.owner_user_id
       <> application_record.owner_user_id
     or unit_record.owner_user_id
       <> readiness_record.owner_user_id then
    raise exception 'AGREEMENT_DRAFT_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if draft_record.ai_request_reference
       <> normalized_request_reference
     or draft_record.ai_provider is null
     or draft_record.ai_model is null
     or draft_record.generation_started_at is null then
    raise exception 'AGREEMENT_GENERATION_CLAIM_INVALID'
      using errcode = '23514';
  end if;

  /*
   * Exact failure replay is idempotent. A different failure code or any
   * successful/terminal state is a conflict.
   */
  if draft_record.status = 'generation_failed' then
    if draft_record.generation_failure_code
         <> normalized_failure_code
       or draft_record.generation_failed_at is null
       or draft_record.draft_content_json is not null
       or draft_record.printable_text is not null
       or draft_record.draft_content_sha256 is not null then
      raise exception 'AGREEMENT_GENERATION_FAILURE_REPLAY_CONFLICT'
        using errcode = '23505';
    end if;

    replayed_value := true;

    return jsonb_build_object(
      'draftId', draft_record.id,
      'readinessId', draft_record.readiness_id,
      'applicationId', draft_record.application_id,
      'unitId', draft_record.unit_id,
      'projectId', draft_record.project_id,
      'version', draft_record.version,
      'status', draft_record.status,
      'readinessStatus', readiness_record.status,
      'failureCode', draft_record.generation_failure_code,
      'failedAt', draft_record.generation_failed_at,
      'advisoryOnly', true,
      'legalEffectCreated', false,
      'signingAllowed', false,
      'registrationAllowed', false,
      'executionAllowed', false,
      'createsPayment', false,
      'marksInventorySold', false,
      'transfersTitle', false,
      'transfersOwnership', false,
      'replayed', replayed_value
    );
  end if;

  if draft_record.status <> 'generation_pending' then
    raise exception 'AGREEMENT_GENERATION_FAILURE_CONFLICT'
      using errcode = '23505';
  end if;

  if draft_record.draft_content_json is not null
     or draft_record.printable_text is not null
     or draft_record.draft_content_sha256 is not null
     or draft_record.generated_at is not null then
    raise exception 'AGREEMENT_GENERATION_CONTENT_CONFLICT'
      using errcode = '23505';
  end if;

  update public.property_unit_booking_agreement_drafts
  set
    status = 'generation_failed',
    generation_failed_at = action_time,
    generation_failure_code = normalized_failure_code,
    updated_at = action_time
  where id = draft_record.id
    and status = 'generation_pending'
    and ai_request_reference =
      normalized_request_reference
    and generation_started_at is not null
    and draft_content_json is null
    and printable_text is null
    and draft_content_sha256 is null
    and generated_at is null
  returning *
  into failed_draft;

  if failed_draft.id is null then
    raise exception 'AGREEMENT_GENERATION_FAILURE_CONFLICT'
      using errcode = '23505';
  end if;

  insert into
    public.property_unit_booking_agreement_draft_events (
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
      metadata
    )
  values (
    failed_draft.id,
    readiness_record.id,
    readiness_record.application_id,
    readiness_record.unit_id,
    readiness_record.project_id,
    null,
    'system',
    'generation_failed',
    'generation_pending',
    'generation_failed',
    jsonb_build_object(
      'aiProvider', failed_draft.ai_provider,
      'aiModel', failed_draft.ai_model,
      'aiRequestReference',
        normalized_request_reference,
      'failureCode', normalized_failure_code,
      'readinessStatePreserved',
        readiness_record.status,
      'advisoryOnly', true,
      'legalEffectCreated', false
    )
  );

  return jsonb_build_object(
    'draftId', failed_draft.id,
    'readinessId', failed_draft.readiness_id,
    'applicationId', failed_draft.application_id,
    'unitId', failed_draft.unit_id,
    'projectId', failed_draft.project_id,
    'version', failed_draft.version,
    'status', failed_draft.status,
    'readinessStatus', readiness_record.status,
    'failureCode', failed_draft.generation_failure_code,
    'failedAt', failed_draft.generation_failed_at,
    'advisoryOnly', true,
    'legalEffectCreated', false,
    'signingAllowed', false,
    'registrationAllowed', false,
    'executionAllowed', false,
    'createsPayment', false,
    'marksInventorySold', false,
    'transfersTitle', false,
    'transfersOwnership', false,
    'replayed', replayed_value
  );
end;
$function$;

revoke all on function
  public.fail_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.fail_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text
  )
to service_role;

comment on function
  public.fail_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text
  ) is
  'Records a bounded failure code for an already-claimed advisory agreement generation while preserving readiness for a later version. It stores no prompt, response, document content, credential or private storage locator and creates no legal or property effect.';

/*
 * MOB-37: Canonical advisory agreement-draft completion.
 *
 * A trusted server worker may record an AI-generated advisory draft only when:
 * - the generation claim identity matches exactly;
 * - the application remains accepted and inventory remains reserved;
 * - the readiness workspace and all bindings remain valid;
 * - every canonical and confidential source is marked included;
 * - the structured output satisfies the minimum private draft contract;
 * - the database independently verifies the supplied SHA-256.
 *
 * Success stops at draft_generated. It creates no legal approval, signing,
 * registration, execution, payment, sale, title or ownership transfer.
 */

create or replace function
  public.complete_property_unit_booking_agreement_advisory_generation (
    target_draft_id uuid,
    target_ai_request_reference text,
    target_draft_content jsonb,
    target_printable_text text,
    target_draft_content_sha256 text
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
  updated_draft
    public.property_unit_booking_agreement_drafts%rowtype;
  updated_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  normalized_request_reference text :=
    nullif(btrim(target_ai_request_reference), '');
  normalized_printable_text text :=
    nullif(btrim(target_printable_text), '');
  normalized_supplied_sha256 text :=
    lower(nullif(btrim(target_draft_content_sha256), ''));

  calculated_sha256 text;
  action_time timestamptz := now();

  total_source_count integer := 0;
  included_source_count integer := 0;
  confidential_source_count integer := 0;
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

  if target_draft_content is null
     or jsonb_typeof(target_draft_content) <> 'object' then
    raise exception 'AGREEMENT_DRAFT_CONTENT_INVALID'
      using errcode = '22023';
  end if;

  if octet_length(target_draft_content::text) > 1048576 then
    raise exception 'AGREEMENT_DRAFT_CONTENT_TOO_LARGE'
      using errcode = '22023';
  end if;

  if normalized_printable_text is null
     or char_length(normalized_printable_text) > 250000 then
    raise exception 'AGREEMENT_PRINTABLE_TEXT_INVALID'
      using errcode = '22023';
  end if;

  if normalized_supplied_sha256 is null
     or normalized_supplied_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'AGREEMENT_DRAFT_HASH_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Minimum structured advisory-draft contract. The later lawyer-review
   * workflow may request revisions, but an incomplete opaque object cannot be
   * accepted as a generated agreement draft.
   */
  if nullif(
       btrim(target_draft_content->>'documentTitle'),
       ''
     ) is null
     or nullif(
       btrim(target_draft_content->>'advisoryNotice'),
       ''
     ) is null
     or jsonb_typeof(target_draft_content->'parties')
       <> 'object'
     or jsonb_typeof(
       target_draft_content->'propertySchedule'
     ) <> 'object'
     or jsonb_typeof(
       target_draft_content->'financialTerms'
     ) <> 'object'
     or jsonb_typeof(target_draft_content->'clauses')
       <> 'array'
     or jsonb_array_length(
       target_draft_content->'clauses'
     ) < 1
     or jsonb_typeof(
       target_draft_content->'lawyerReview'
     ) <> 'object' then
    raise exception 'AGREEMENT_DRAFT_STRUCTURE_INVALID'
      using errcode = '22023';
  end if;

  if coalesce(
       (target_draft_content->>'advisoryOnly')::boolean,
       false
     ) is distinct from true
     or coalesce(
       (
         target_draft_content
           ->>'lawyerReviewRequired'
       )::boolean,
       false
     ) is distinct from true then
    raise exception 'AGREEMENT_DRAFT_ADVISORY_POLICY_INVALID'
      using errcode = '23514';
  end if;

  calculated_sha256 := encode(
    extensions.digest(
      convert_to(
        target_draft_content::text
          || E'\n'
          || normalized_printable_text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  if calculated_sha256 <> normalized_supplied_sha256 then
    raise exception 'AGREEMENT_DRAFT_HASH_MISMATCH'
      using errcode = '23514';
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
   * Exact successful replay is idempotent.
   */
  if draft_record.status = 'generated' then
    if draft_record.draft_content_sha256
         <> calculated_sha256
       or draft_record.draft_content_json
         is distinct from target_draft_content
       or draft_record.printable_text
         <> normalized_printable_text
       or draft_record.generated_at is null then
      raise exception 'AGREEMENT_GENERATION_REPLAY_CONFLICT'
        using errcode = '23505';
    end if;

    if readiness_record.status <> 'draft_generated' then
      raise exception 'AGREEMENT_READINESS_STATE_CONFLICT'
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
      'promptVersion', draft_record.prompt_version,
      'draftFormat', draft_record.draft_format,
      'draftContentSha256',
        draft_record.draft_content_sha256,
      'generatedAt', draft_record.generated_at,
      'advisoryOnly', true,
      'lawyerReviewRequired', true,
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
    raise exception 'AGREEMENT_GENERATION_COMPLETION_CONFLICT'
      using errcode = '23505';
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '23514';
  end if;

  if unit_record.status <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '23514';
  end if;

  if readiness_record.status <> 'ready_for_draft'
     or readiness_record.ready_for_draft_at is null
     or readiness_record.property_schedule_confirmed_at is null
     or readiness_record.buyer_details_confirmed_at is null
     or readiness_record.owner_details_confirmed_at is null then
    raise exception 'AGREEMENT_NOT_READY_FOR_DRAFT'
      using errcode = '23514';
  end if;

  if readiness_record.cancelled_at is not null then
    raise exception 'AGREEMENT_READINESS_CANCELLED'
      using errcode = '23514';
  end if;

  if readiness_record.expires_at is not null
     and readiness_record.expires_at <= action_time then
    raise exception 'AGREEMENT_READINESS_EXPIRED'
      using errcode = '23514';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where source.included_in_generation
        and source.included_at is not null
    )::integer,
    count(*) filter (
      where source.source_kind =
        'confidential_legal_document'
    )::integer
  into
    total_source_count,
    included_source_count,
    confidential_source_count
  from public.property_unit_booking_agreement_draft_sources source
  where source.draft_id = draft_record.id;

  if total_source_count < 3
     or included_source_count <> total_source_count then
    raise exception 'AGREEMENT_GENERATION_SOURCES_INCOMPLETE'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.source_kind =
        'canonical_property_schedule'
      and source.included_in_generation
      and source.included_at is not null
  ) or not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.source_kind =
        'buyer_confirmed_particulars'
      and source.included_in_generation
      and source.included_at is not null
  ) or not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.source_kind =
        'owner_confirmed_particulars'
      and source.included_in_generation
      and source.included_at is not null
  ) then
    raise exception 'AGREEMENT_CANONICAL_SOURCES_INCOMPLETE'
      using errcode = '23514';
  end if;

  update public.property_unit_booking_agreement_drafts
  set
    status = 'generated',
    draft_content_json = target_draft_content,
    printable_text = normalized_printable_text,
    draft_content_sha256 = calculated_sha256,
    generated_at = action_time,
    generation_failed_at = null,
    generation_failure_code = null,
    updated_at = action_time
  where id = draft_record.id
    and status = 'generation_pending'
    and ai_request_reference =
      normalized_request_reference
    and generation_started_at is not null
  returning *
  into updated_draft;

  if updated_draft.id is null then
    raise exception 'AGREEMENT_GENERATION_COMPLETION_CONFLICT'
      using errcode = '23505';
  end if;

  update public.property_unit_booking_agreement_readiness
  set
    status = 'draft_generated',
    updated_at = action_time
  where id = readiness_record.id
    and status = 'ready_for_draft'
    and ready_for_draft_at is not null
    and property_schedule_confirmed_at is not null
    and buyer_details_confirmed_at is not null
    and owner_details_confirmed_at is not null
  returning *
  into updated_readiness;

  if updated_readiness.id is null then
    raise exception 'AGREEMENT_READINESS_STATE_CONFLICT'
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
    updated_draft.id,
    updated_readiness.id,
    updated_readiness.application_id,
    updated_readiness.unit_id,
    updated_readiness.project_id,
    null,
    'system',
    'draft_generated',
    'generation_pending',
    'generated',
    jsonb_build_object(
      'aiProvider', updated_draft.ai_provider,
      'aiModel', updated_draft.ai_model,
      'aiRequestReference',
        normalized_request_reference,
      'draftContentSha256',
        updated_draft.draft_content_sha256,
      'sourceCount', total_source_count,
      'confidentialLegalDocumentCount',
        confidential_source_count,
      'advisoryOnly', true,
      'lawyerReviewRequired', true,
      'legalEffectCreated', false
    )
  );

  return jsonb_build_object(
    'draftId', updated_draft.id,
    'readinessId', updated_draft.readiness_id,
    'applicationId', updated_draft.application_id,
    'unitId', updated_draft.unit_id,
    'projectId', updated_draft.project_id,
    'version', updated_draft.version,
    'status', updated_draft.status,
    'readinessStatus', updated_readiness.status,
    'promptVersion', updated_draft.prompt_version,
    'draftFormat', updated_draft.draft_format,
    'draftContentSha256',
      updated_draft.draft_content_sha256,
    'generatedAt', updated_draft.generated_at,
    'sourceCount', total_source_count,
    'confidentialLegalDocumentCount',
      confidential_source_count,
    'advisoryOnly', true,
    'lawyerReviewRequired', true,
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
  public.complete_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    jsonb,
    text,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.complete_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    jsonb,
    text,
    text
  )
to service_role;

comment on function
  public.complete_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    jsonb,
    text,
    text
  ) is
  'Records a hash-verified advisory AI draft after every bound source is included and transitions readiness only to draft_generated. It creates no legal approval, signing, registration, execution, payment, sale, title transfer or ownership transfer.';

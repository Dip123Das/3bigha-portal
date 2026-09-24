/*
 * MOB-37: Audited confidential legal-source access for advisory generation.
 *
 * The trusted server must call this authority separately for each confidential
 * legal document immediately before retrieving it from private storage.
 *
 * This authority:
 * - validates the claimed generation and exact source binding;
 * - returns one verified private storage locator to service_role;
 * - marks only that source as included;
 * - creates an append-only source-opened audit event.
 *
 * It does not create a signed URL, download a file, invoke AI, generate or
 * approve an agreement, permit signing/registration/execution, collect money,
 * sell inventory, or transfer title or ownership.
 */

create or replace function
  public.open_property_unit_booking_agreement_generation_source (
    target_draft_id uuid,
    target_document_id uuid,
    target_ai_request_reference text
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
  source_record
    public.property_unit_booking_agreement_draft_sources%rowtype;
  document_record
    public.property_project_legal_documents%rowtype;

  normalized_request_reference text :=
    nullif(btrim(target_ai_request_reference), '');

  action_time timestamptz := now();
  replayed_value boolean := false;
begin
  if target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_REQUIRED'
      using errcode = '22023';
  end if;

  if target_document_id is null then
    raise exception 'AGREEMENT_DOCUMENT_REQUIRED'
      using errcode = '22023';
  end if;

  if normalized_request_reference is null
     or char_length(normalized_request_reference) > 200 then
    raise exception 'AGREEMENT_AI_REQUEST_REFERENCE_INVALID'
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

  select source.*
  into source_record
  from public.property_unit_booking_agreement_draft_sources source
  where source.draft_id = draft_record.id
    and source.source_kind = 'confidential_legal_document'
    and source.document_id = target_document_id
  for update;

  if source_record.id is null then
    raise exception 'AGREEMENT_DOCUMENT_SOURCE_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select document.*
  into document_record
  from public.property_project_legal_documents document
  where document.id = target_document_id
  for update;

  if document_record.id is null then
    raise exception 'AGREEMENT_DOCUMENT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  /*
   * Revalidate all bindings after the complete lock sequence.
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

  if source_record.readiness_id <> readiness_record.id
     or source_record.project_id <> readiness_record.project_id
     or source_record.document_id <> document_record.id
     or source_record.source_kind
       <> 'confidential_legal_document' then
    raise exception 'AGREEMENT_DOCUMENT_SOURCE_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if document_record.project_id <> readiness_record.project_id
     or document_record.owner_user_id
       <> readiness_record.owner_user_id
     or document_record.sha256 <> source_record.source_sha256
     or document_record.superseded_at is not null then
    raise exception 'AGREEMENT_DOCUMENT_SOURCE_CHANGED'
      using errcode = '23505';
  end if;

  if not exists (
    select 1
    from public.property_unit_legal_document_links link
    where link.unit_id = readiness_record.unit_id
      and link.project_id = readiness_record.project_id
      and link.document_id = document_record.id
  ) then
    raise exception 'AGREEMENT_DOCUMENT_UNIT_LINK_INVALID'
      using errcode = '23514';
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

  if draft_record.status <> 'generation_pending'
     or draft_record.generation_started_at is null
     or draft_record.ai_provider is null
     or draft_record.ai_model is null
     or draft_record.ai_request_reference is null then
    raise exception 'AGREEMENT_GENERATION_NOT_CLAIMED'
      using errcode = '23514';
  end if;

  if draft_record.ai_request_reference
       <> normalized_request_reference then
    raise exception 'AGREEMENT_GENERATION_REQUEST_CONFLICT'
      using errcode = '23505';
  end if;

  if nullif(btrim(document_record.storage_bucket), '') is null
     or document_record.storage_bucket
       <> 'property-documents-private'
     or nullif(btrim(document_record.storage_path), '') is null then
    raise exception 'AGREEMENT_DOCUMENT_STORAGE_INVALID'
      using errcode = '23514';
  end if;

  if document_record.file_size_bytes < 1
     or document_record.file_size_bytes > 8388608
     or nullif(btrim(document_record.mime_type), '') is null
     or document_record.sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'AGREEMENT_DOCUMENT_METADATA_INVALID'
      using errcode = '23514';
  end if;

  /*
   * Exact replay returns the same canonical locator without duplicating the
   * append-only source-opened event.
   */
  if source_record.included_in_generation then
    if source_record.included_at is null then
      raise exception 'AGREEMENT_DOCUMENT_INCLUSION_INVALID'
        using errcode = '23514';
    end if;

    replayed_value := true;
  else
    update public.property_unit_booking_agreement_draft_sources
    set
      included_in_generation = true,
      included_at = action_time
    where id = source_record.id
      and not included_in_generation
      and included_at is null
    returning *
    into source_record;

    if source_record.id is null then
      raise exception 'AGREEMENT_DOCUMENT_ACCESS_CONFLICT'
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
        document_id,
        metadata
      )
    values (
      draft_record.id,
      readiness_record.id,
      readiness_record.application_id,
      readiness_record.unit_id,
      readiness_record.project_id,
      null,
      'system',
      'source_opened_for_generation',
      'generation_pending',
      'generation_pending',
      document_record.id,
      jsonb_build_object(
        'aiRequestReference',
          normalized_request_reference,
        'documentType', document_record.document_type,
        'mimeType', document_record.mime_type,
        'fileSizeBytes', document_record.file_size_bytes,
        'sha256', document_record.sha256,
        'privateBucketVerified', true,
        'advisoryGenerationOnly', true
      )
    );
  end if;

  /*
   * The storage locator is intentionally returned only by this service-role
   * function. No signed URL or file content is created here.
   */
  return jsonb_build_object(
    'draftId', draft_record.id,
    'readinessId', readiness_record.id,
    'applicationId', readiness_record.application_id,
    'unitId', readiness_record.unit_id,
    'projectId', readiness_record.project_id,
    'aiRequestReference', normalized_request_reference,
    'source', jsonb_build_object(
      'documentId', document_record.id,
      'documentType', document_record.document_type,
      'title', document_record.title,
      'storageBucket', document_record.storage_bucket,
      'storagePath', document_record.storage_path,
      'originalFilename', document_record.original_filename,
      'mimeType', document_record.mime_type,
      'fileSizeBytes', document_record.file_size_bytes,
      'sha256', document_record.sha256,
      'analysisStatus', document_record.analysis_status,
      'includedAt', source_record.included_at
    ),
    'policy', jsonb_build_object(
      'privateServiceRoleOnly', true,
      'signedUrlCreated', false,
      'documentDownloaded', false,
      'aiRequestExecuted', false,
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
    ),
    'replayed', replayed_value
  );
end;
$function$;

revoke all on function
  public.open_property_unit_booking_agreement_generation_source(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.open_property_unit_booking_agreement_generation_source(
    uuid,
    uuid,
    text
  )
to service_role;

comment on function
  public.open_property_unit_booking_agreement_generation_source(
    uuid,
    uuid,
    text
  ) is
  'Returns one verified private legal-document storage locator to the trusted advisory-generation worker and records an append-only source-opened event. It creates no signed URL, performs no download or AI call, creates no legal effect, collects no payment, and changes no property ownership state.';

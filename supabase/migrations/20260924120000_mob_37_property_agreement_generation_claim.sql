/*
 * MOB-37: Trusted advisory agreement-generation claim.
 *
 * This service-role-only authority freezes the AI execution identity and
 * returns the canonical private source package to a trusted server worker.
 *
 * It does not:
 * - open or download a confidential legal document;
 * - invoke an AI provider;
 * - generate or approve an agreement;
 * - permit signing, registration or execution;
 * - collect payment;
 * - mutate inventory, application, title or ownership.
 */

create or replace function
  public.claim_property_unit_booking_agreement_advisory_generation (
    target_draft_id uuid,
    target_ai_provider text,
    target_ai_model text,
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

  buyer_party
    public.property_unit_booking_agreement_party_inputs%rowtype;
  owner_party
    public.property_unit_booking_agreement_party_inputs%rowtype;

  normalized_provider text :=
    lower(nullif(btrim(target_ai_provider), ''));
  normalized_model text :=
    nullif(btrim(target_ai_model), '');
  normalized_request_reference text :=
    nullif(btrim(target_ai_request_reference), '');

  action_time timestamptz := now();

  schedule_source jsonb;
  buyer_source jsonb;
  owner_source jsonb;
  legal_source_manifest jsonb;

  schedule_sha256 text;
  buyer_sha256 text;
  owner_sha256 text;
  legal_document_count integer := 0;
  structured_source_count integer := 0;
  replayed_value boolean := false;
begin
  if target_draft_id is null then
    raise exception 'AGREEMENT_DRAFT_REQUIRED'
      using errcode = '22023';
  end if;

  if normalized_provider is null
     or normalized_provider <> 'openai' then
    raise exception 'AGREEMENT_AI_PROVIDER_INVALID'
      using errcode = '22023';
  end if;

  if normalized_model is null
     or char_length(normalized_model) > 120 then
    raise exception 'AGREEMENT_AI_MODEL_INVALID'
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

  select party.*
  into buyer_party
  from public.property_unit_booking_agreement_party_inputs party
  where party.readiness_id = readiness_record.id
    and party.party_role = 'buyer'
  for update;

  select party.*
  into owner_party
  from public.property_unit_booking_agreement_party_inputs party
  where party.readiness_id = readiness_record.id
    and party.party_role = 'owner'
  for update;

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

  if draft_record.status <> 'generation_pending' then
    raise exception 'AGREEMENT_GENERATION_CLAIM_CONFLICT'
      using errcode = '23505';
  end if;

  if buyer_party.id is null
     or buyer_party.party_user_id
       <> readiness_record.buyer_user_id
     or buyer_party.status <> 'confirmed'
     or buyer_party.confirmed_at is null
     or buyer_party.submitted_at is null
     or not buyer_party.consent_accepted
     or buyer_party.consent_accepted_at is null then
    raise exception 'AGREEMENT_BUYER_DETAILS_NOT_CONFIRMED'
      using errcode = '23514';
  end if;

  if owner_party.id is null
     or owner_party.party_user_id
       <> readiness_record.owner_user_id
     or owner_party.status <> 'confirmed'
     or owner_party.confirmed_at is null
     or owner_party.submitted_at is null
     or not owner_party.consent_accepted
     or owner_party.consent_accepted_at is null then
    raise exception 'AGREEMENT_OWNER_DETAILS_NOT_CONFIRMED'
      using errcode = '23514';
  end if;

  /*
   * An identical retry is idempotent. Any different execution identity is a
   * concurrency conflict and must not take over the pending generation.
   */
  if draft_record.generation_started_at is not null then
    if draft_record.ai_provider = normalized_provider
       and draft_record.ai_model = normalized_model
       and draft_record.ai_request_reference
         = normalized_request_reference then
      replayed_value := true;
    else
      raise exception 'AGREEMENT_GENERATION_ALREADY_CLAIMED'
        using errcode = '23505';
    end if;
  elsif draft_record.ai_provider is not null
     or draft_record.ai_model is not null
     or draft_record.ai_request_reference is not null then
    raise exception 'AGREEMENT_GENERATION_IDENTITY_CONFLICT'
      using errcode = '23505';
  end if;

  schedule_source := jsonb_build_object(
    'readinessVersion', readiness_record.readiness_version,
    'applicationId', readiness_record.application_id,
    'holdId', readiness_record.hold_id,
    'unitId', readiness_record.unit_id,
    'projectId', readiness_record.project_id,
    'unitCode', readiness_record.unit_code_snapshot,
    'unitTitle', readiness_record.unit_title_snapshot,
    'unitKind', readiness_record.unit_kind_snapshot,
    'projectName', readiness_record.project_name_snapshot,
    'quotedPropertyPricePaise',
      readiness_record.quoted_property_price_paise,
    'currency', readiness_record.currency,
    'plotAreaSqft', readiness_record.plot_area_sqft,
    'builtUpSqft', readiness_record.built_up_sqft,
    'carpetSqft', readiness_record.carpet_sqft,
    'superBuiltUpSqft',
      readiness_record.super_built_up_sqft,
    'dimensionLengthFt',
      readiness_record.dimension_length_ft,
    'dimensionWidthFt',
      readiness_record.dimension_width_ft,
    'floorNumber', readiness_record.floor_number_snapshot,
    'unitNumber', readiness_record.unit_number_snapshot,
    'facing', readiness_record.facing_snapshot,
    'boundaryNorth', readiness_record.boundary_north,
    'boundarySouth', readiness_record.boundary_south,
    'boundaryEast', readiness_record.boundary_east,
    'boundaryWest', readiness_record.boundary_west,
    'boundaryDemarcation',
      readiness_record.boundary_demarcation_snapshot,
    'plotNumbers', readiness_record.plot_numbers_snapshot,
    'deedNumbers', readiness_record.deed_numbers_snapshot,
    'mutationNumbers',
      readiness_record.mutation_numbers_snapshot,
    'khatianNumbers',
      readiness_record.khatian_numbers_snapshot,
    'propertyAddress',
      readiness_record.property_address_snapshot,
    'printLayout', jsonb_build_object(
      'pageSize', readiness_record.print_page_size,
      'orientation', readiness_record.print_orientation,
      'marginTopMm',
        readiness_record.print_margin_top_mm,
      'marginRightMm',
        readiness_record.print_margin_right_mm,
      'marginBottomMm',
        readiness_record.print_margin_bottom_mm,
      'marginLeftMm',
        readiness_record.print_margin_left_mm,
      'customPageWidthMm',
        readiness_record.custom_page_width_mm,
      'customPageHeightMm',
        readiness_record.custom_page_height_mm
    ),
    'propertyScheduleConfirmedAt',
      readiness_record.property_schedule_confirmed_at
  );

  buyer_source := jsonb_build_object(
    'partyRole', 'buyer',
    'inputVersion', buyer_party.input_version,
    'legalName', buyer_party.legal_name,
    'relationType', buyer_party.relation_type,
    'relationName', buyer_party.relation_name,
    'addressLine1', buyer_party.address_line_1,
    'addressLine2', buyer_party.address_line_2,
    'villageOrLocality', buyer_party.village_or_locality,
    'postOffice', buyer_party.post_office,
    'policeStation', buyer_party.police_station,
    'blockOrMunicipality',
      buyer_party.block_or_municipality,
    'district', buyer_party.district,
    'state', buyer_party.state,
    'pincode', buyer_party.pincode,
    'identityDocumentType',
      buyer_party.identity_document_type,
    'identityMaskedReference',
      buyer_party.identity_masked_reference,
    'authorityCapacity', buyer_party.authority_capacity,
    'consentAcceptedAt', buyer_party.consent_accepted_at,
    'confirmedAt', buyer_party.confirmed_at
  );

  owner_source := jsonb_build_object(
    'partyRole', 'owner',
    'inputVersion', owner_party.input_version,
    'legalName', owner_party.legal_name,
    'relationType', owner_party.relation_type,
    'relationName', owner_party.relation_name,
    'addressLine1', owner_party.address_line_1,
    'addressLine2', owner_party.address_line_2,
    'villageOrLocality', owner_party.village_or_locality,
    'postOffice', owner_party.post_office,
    'policeStation', owner_party.police_station,
    'blockOrMunicipality',
      owner_party.block_or_municipality,
    'district', owner_party.district,
    'state', owner_party.state,
    'pincode', owner_party.pincode,
    'identityDocumentType',
      owner_party.identity_document_type,
    'identityMaskedReference',
      owner_party.identity_masked_reference,
    'authorityCapacity', owner_party.authority_capacity,
    'consentAcceptedAt', owner_party.consent_accepted_at,
    'confirmedAt', owner_party.confirmed_at
  );

  schedule_sha256 := encode(
    extensions.digest(
      convert_to(schedule_source::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  buyer_sha256 := encode(
    extensions.digest(
      convert_to(buyer_source::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  owner_sha256 := encode(
    extensions.digest(
      convert_to(owner_source::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  if not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.readiness_id = readiness_record.id
      and source.project_id = readiness_record.project_id
      and source.source_kind = 'canonical_property_schedule'
      and source.source_key = 'canonical-property-schedule'
      and source.document_id is null
      and source.source_sha256 = schedule_sha256
  ) then
    raise exception 'AGREEMENT_SCHEDULE_SOURCE_CHANGED'
      using errcode = '23505';
  end if;

  if not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.readiness_id = readiness_record.id
      and source.project_id = readiness_record.project_id
      and source.source_kind = 'buyer_confirmed_particulars'
      and source.source_key = 'buyer-confirmed-particulars'
      and source.document_id is null
      and source.source_sha256 = buyer_sha256
  ) then
    raise exception 'AGREEMENT_BUYER_SOURCE_CHANGED'
      using errcode = '23505';
  end if;

  if not exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = draft_record.id
      and source.readiness_id = readiness_record.id
      and source.project_id = readiness_record.project_id
      and source.source_kind = 'owner_confirmed_particulars'
      and source.source_key = 'owner-confirmed-particulars'
      and source.document_id is null
      and source.source_sha256 = owner_sha256
  ) then
    raise exception 'AGREEMENT_OWNER_SOURCE_CHANGED'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.property_unit_booking_agreement_draft_sources source
    left join public.property_project_legal_documents document
      on document.id = source.document_id
    left join public.property_unit_legal_document_links link
      on link.document_id = source.document_id
     and link.unit_id = readiness_record.unit_id
     and link.project_id = readiness_record.project_id
    where source.draft_id = draft_record.id
      and source.source_kind = 'confidential_legal_document'
      and (
        document.id is null
        or document.project_id <> readiness_record.project_id
        or document.superseded_at is not null
        or document.sha256 <> source.source_sha256
        or link.document_id is null
      )
  ) then
    raise exception 'AGREEMENT_LEGAL_SOURCE_CHANGED'
      using errcode = '23505';
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'documentId', document.id,
          'documentType', document.document_type,
          'title', document.title,
          'mimeType', document.mime_type,
          'fileSizeBytes', document.file_size_bytes,
          'sha256', document.sha256,
          'analysisStatus', document.analysis_status
        )
        order by document.id
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into
    legal_source_manifest,
    legal_document_count
  from public.property_unit_booking_agreement_draft_sources source
  join public.property_project_legal_documents document
    on document.id = source.document_id
   and document.project_id = readiness_record.project_id
  where source.draft_id = draft_record.id
    and source.source_kind = 'confidential_legal_document';

  if not replayed_value then
    update public.property_unit_booking_agreement_drafts
    set
      ai_provider = normalized_provider,
      ai_model = normalized_model,
      ai_request_reference = normalized_request_reference,
      generation_started_at = action_time,
      updated_at = action_time
    where id = draft_record.id
      and status = 'generation_pending'
      and generation_started_at is null
      and ai_provider is null
      and ai_model is null
      and ai_request_reference is null
    returning *
    into draft_record;

    if draft_record.id is null then
      raise exception 'AGREEMENT_GENERATION_CLAIM_CONFLICT'
        using errcode = '23505';
    end if;

    update public.property_unit_booking_agreement_draft_sources
    set
      included_in_generation = true,
      included_at = action_time
    where draft_id = draft_record.id
      and source_kind in (
        'canonical_property_schedule',
        'buyer_confirmed_particulars',
        'owner_confirmed_particulars'
      )
      and not included_in_generation;

    get diagnostics structured_source_count = row_count;

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
      draft_record.id,
      readiness_record.id,
      readiness_record.application_id,
      readiness_record.unit_id,
      readiness_record.project_id,
      null,
      'system',
      'generation_started',
      'generation_pending',
      'generation_pending',
      jsonb_build_object(
        'aiProvider', normalized_provider,
        'aiModel', normalized_model,
        'aiRequestReference',
          normalized_request_reference,
        'structuredSourceCount',
          structured_source_count,
        'confidentialLegalDocumentCount',
          legal_document_count,
        'confidentialDocumentsOpened', false,
        'advisoryOnly', true
      )
    );
  end if;

  return jsonb_build_object(
    'claim', jsonb_build_object(
      'draftId', draft_record.id,
      'readinessId', draft_record.readiness_id,
      'applicationId', draft_record.application_id,
      'unitId', draft_record.unit_id,
      'projectId', draft_record.project_id,
      'version', draft_record.version,
      'status', draft_record.status,
      'promptVersion', draft_record.prompt_version,
      'draftFormat', draft_record.draft_format,
      'sourceSnapshotSha256',
        draft_record.source_snapshot_sha256,
      'aiProvider', normalized_provider,
      'aiModel', normalized_model,
      'aiRequestReference',
        normalized_request_reference,
      'generationStartedAt',
        draft_record.generation_started_at,
      'replayed', replayed_value
    ),
    'sourcePackage', jsonb_build_object(
      'canonicalPropertySchedule', schedule_source,
      'buyerConfirmedParticulars', buyer_source,
      'ownerConfirmedParticulars', owner_source,
      'confidentialLegalDocuments',
        legal_source_manifest
    ),
    'policy', jsonb_build_object(
      'confidentialDocumentsOpened', false,
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
    )
  );
end;
$function$;

revoke all on function
  public.claim_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text,
    text
  )
from public, anon, authenticated;

grant execute on function
  public.claim_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text,
    text
  )
to service_role;

comment on function
  public.claim_property_unit_booking_agreement_advisory_generation(
    uuid,
    text,
    text,
    text
  ) is
  'Claims one generation-pending advisory agreement draft for a trusted server worker and returns its canonical private source package. It does not open confidential files, execute an AI request, create legal effect, approve or execute an agreement, collect payment, sell inventory, or transfer title or ownership.';

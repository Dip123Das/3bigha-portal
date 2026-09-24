/*
 * MOB-37: Canonical advisory agreement-draft preparation.
 *
 * This authority:
 * - permits only the buyer or owner bound to a ready workspace;
 * - locks the unit before the application and readiness workspace;
 * - verifies both private party submissions and the property schedule;
 * - creates a generation-pending advisory draft;
 * - binds deterministic hashes for canonical sources;
 * - records confidential legal-document metadata without opening files;
 * - performs no AI request, document download, legal approval, signing,
 *   registration, execution, payment, sale or ownership transfer.
 */

create extension if not exists pgcrypto
  with schema extensions;

create or replace function
  public.prepare_property_unit_booking_agreement_advisory_draft (
    target_actor_user_id uuid,
    target_readiness_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  readiness_preview
    public.property_unit_booking_agreement_readiness%rowtype;

  unit_record public.builder_inventory_units%rowtype;
  application_record
    public.property_unit_booking_applications%rowtype;
  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;

  buyer_party
    public.property_unit_booking_agreement_party_inputs%rowtype;
  owner_party
    public.property_unit_booking_agreement_party_inputs%rowtype;

  existing_draft
    public.property_unit_booking_agreement_drafts%rowtype;
  prepared_draft
    public.property_unit_booking_agreement_drafts%rowtype;

  actor_role_value text;
  action_time timestamptz := now();
  next_version integer;

  schedule_source jsonb;
  buyer_source jsonb;
  owner_source jsonb;
  legal_source_manifest jsonb;
  complete_source_snapshot jsonb;

  schedule_sha256 text;
  buyer_sha256 text;
  owner_sha256 text;
  source_snapshot_sha256_value text;

  legal_document_count integer := 0;
  source_count integer := 3;
begin
  if target_actor_user_id is null then
    raise exception 'AGREEMENT_ACTOR_REQUIRED'
      using errcode = '22023';
  end if;

  if target_readiness_id is null then
    raise exception 'AGREEMENT_READINESS_REQUIRED'
      using errcode = '22023';
  end if;

  /*
   * Resolve the unit without taking a lock. The canonical lock sequence below
   * always begins with the inventory unit.
   */
  select readiness.*
  into readiness_preview
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id;

  if readiness_preview.id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select unit.*
  into unit_record
  from public.builder_inventory_units unit
  where unit.id = readiness_preview.unit_id
  for update;

  if unit_record.id is null then
    raise exception 'PROPERTY_UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  where application.id = readiness_preview.application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select readiness.*
  into readiness_record
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id
  for update;

  if readiness_record.id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
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

  /*
   * Revalidate every identity and property binding after acquiring locks.
   */
  if readiness_record.application_id <> application_record.id
     or readiness_record.unit_id <> unit_record.id
     or readiness_record.project_id <> unit_record.project_id
     or readiness_record.buyer_user_id
       <> application_record.buyer_user_id
     or readiness_record.owner_user_id
       <> application_record.owner_user_id
     or unit_record.owner_user_id
       <> readiness_record.owner_user_id then
    raise exception 'AGREEMENT_DRAFT_BINDING_INVALID'
      using errcode = '23514';
  end if;

  if target_actor_user_id = readiness_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
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
   * Build canonical in-transaction representations. These values are hashed;
   * private party particulars are not copied into the draft ledger.
   */
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
    'printPageSize', readiness_record.print_page_size,
    'printOrientation', readiness_record.print_orientation,
    'printMarginTopMm',
      readiness_record.print_margin_top_mm,
    'printMarginRightMm',
      readiness_record.print_margin_right_mm,
    'printMarginBottomMm',
      readiness_record.print_margin_bottom_mm,
    'printMarginLeftMm',
      readiness_record.print_margin_left_mm,
    'customPageWidthMm',
      readiness_record.custom_page_width_mm,
    'customPageHeightMm',
      readiness_record.custom_page_height_mm,
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

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'documentId', document.id,
          'documentType', document.document_type,
          'sha256', document.sha256
        )
        order by document.id
      ),
      '[]'::jsonb
    ),
    count(*)::integer
  into
    legal_source_manifest,
    legal_document_count
  from public.property_unit_legal_document_links link
  join public.property_project_legal_documents document
    on document.id = link.document_id
   and document.project_id = readiness_record.project_id
  where link.unit_id = readiness_record.unit_id
    and link.project_id = readiness_record.project_id
    and document.superseded_at is null;

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

  complete_source_snapshot := jsonb_build_object(
    'promptVersion', 'property-agreement-ai-draft-v1',
    'scheduleSha256', schedule_sha256,
    'buyerParticularsSha256', buyer_sha256,
    'ownerParticularsSha256', owner_sha256,
    'legalDocuments', legal_source_manifest
  );

  source_snapshot_sha256_value := encode(
    extensions.digest(
      convert_to(complete_source_snapshot::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  /*
   * A matching live draft is an exact idempotent replay. A live draft bound
   * to a different canonical snapshot requires explicit reconciliation.
   */
  select draft.*
  into existing_draft
  from public.property_unit_booking_agreement_drafts draft
  where draft.readiness_id = readiness_record.id
    and draft.status in (
      'generation_pending',
      'generated',
      'lawyer_review_pending',
      'lawyer_changes_requested'
    )
  order by draft.version desc
  limit 1
  for update;

  if existing_draft.id is not null then
    if existing_draft.application_id
         <> readiness_record.application_id
       or existing_draft.hold_id <> readiness_record.hold_id
       or existing_draft.unit_id <> readiness_record.unit_id
       or existing_draft.project_id <> readiness_record.project_id
       or existing_draft.buyer_user_id
         <> readiness_record.buyer_user_id
       or existing_draft.owner_user_id
         <> readiness_record.owner_user_id then
      raise exception 'AGREEMENT_DRAFT_BINDING_CONFLICT'
        using errcode = '23505';
    end if;

    if existing_draft.source_snapshot_sha256
         <> source_snapshot_sha256_value then
      raise exception 'AGREEMENT_DRAFT_SOURCE_CHANGED'
        using errcode = '23505';
    end if;

    select count(*)::integer
    into source_count
    from public.property_unit_booking_agreement_draft_sources source
    where source.draft_id = existing_draft.id;

    return jsonb_build_object(
      'draftId', existing_draft.id,
      'readinessId', existing_draft.readiness_id,
      'applicationId', existing_draft.application_id,
      'unitId', existing_draft.unit_id,
      'projectId', existing_draft.project_id,
      'version', existing_draft.version,
      'status', existing_draft.status,
      'promptVersion', existing_draft.prompt_version,
      'sourceSnapshotSha256',
        existing_draft.source_snapshot_sha256,
      'sourceCount', source_count,
      'confidentialLegalDocumentCount',
        legal_document_count,
      'confidentialDocumentsOpened', false,
      'aiRequestCreated', false,
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
      'replayed', true
    );
  end if;

  select coalesce(max(draft.version), 0) + 1
  into next_version
  from public.property_unit_booking_agreement_drafts draft
  where draft.readiness_id = readiness_record.id;

  insert into public.property_unit_booking_agreement_drafts (
    readiness_id,
    application_id,
    hold_id,
    unit_id,
    project_id,
    buyer_user_id,
    owner_user_id,
    version,
    status,
    prompt_version,
    draft_format,
    source_snapshot_sha256
  )
  values (
    readiness_record.id,
    readiness_record.application_id,
    readiness_record.hold_id,
    readiness_record.unit_id,
    readiness_record.project_id,
    readiness_record.buyer_user_id,
    readiness_record.owner_user_id,
    next_version,
    'generation_pending',
    'property-agreement-ai-draft-v1',
    'structured_json_v1',
    source_snapshot_sha256_value
  )
  returning *
  into prepared_draft;

  insert into
    public.property_unit_booking_agreement_draft_sources (
      draft_id,
      readiness_id,
      project_id,
      source_kind,
      source_key,
      document_id,
      source_sha256,
      included_in_generation
    )
  values
    (
      prepared_draft.id,
      readiness_record.id,
      readiness_record.project_id,
      'canonical_property_schedule',
      'canonical-property-schedule',
      null,
      schedule_sha256,
      false
    ),
    (
      prepared_draft.id,
      readiness_record.id,
      readiness_record.project_id,
      'buyer_confirmed_particulars',
      'buyer-confirmed-particulars',
      null,
      buyer_sha256,
      false
    ),
    (
      prepared_draft.id,
      readiness_record.id,
      readiness_record.project_id,
      'owner_confirmed_particulars',
      'owner-confirmed-particulars',
      null,
      owner_sha256,
      false
    );

  insert into
    public.property_unit_booking_agreement_draft_sources (
      draft_id,
      readiness_id,
      project_id,
      source_kind,
      source_key,
      document_id,
      source_sha256,
      included_in_generation
    )
  select
    prepared_draft.id,
    readiness_record.id,
    readiness_record.project_id,
    'confidential_legal_document',
    'legal-document:' || document.id::text,
    document.id,
    document.sha256,
    false
  from public.property_unit_legal_document_links link
  join public.property_project_legal_documents document
    on document.id = link.document_id
   and document.project_id = readiness_record.project_id
  where link.unit_id = readiness_record.unit_id
    and link.project_id = readiness_record.project_id
    and document.superseded_at is null
  order by document.id;

  source_count := 3 + legal_document_count;

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
    prepared_draft.id,
    readiness_record.id,
    readiness_record.application_id,
    readiness_record.unit_id,
    readiness_record.project_id,
    target_actor_user_id,
    actor_role_value,
    'generation_requested',
    null,
    'generation_pending',
    jsonb_build_object(
      'promptVersion',
        'property-agreement-ai-draft-v1',
      'sourceSnapshotSha256',
        source_snapshot_sha256_value,
      'sourceCount', source_count,
      'confidentialLegalDocumentCount',
        legal_document_count,
      'confidentialDocumentsOpened', false,
      'aiRequestCreated', false,
      'advisoryOnly', true
    )
  );

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
    prepared_draft.id,
    readiness_record.id,
    readiness_record.application_id,
    readiness_record.unit_id,
    readiness_record.project_id,
    target_actor_user_id,
    actor_role_value,
    'source_bound',
    'generation_pending',
    'generation_pending',
    jsonb_build_object(
      'canonicalScheduleBound', true,
      'buyerParticularsBound', true,
      'ownerParticularsBound', true,
      'confidentialLegalDocumentCount',
        legal_document_count,
      'confidentialDocumentsOpened', false
    )
  );

  return jsonb_build_object(
    'draftId', prepared_draft.id,
    'readinessId', prepared_draft.readiness_id,
    'applicationId', prepared_draft.application_id,
    'unitId', prepared_draft.unit_id,
    'projectId', prepared_draft.project_id,
    'version', prepared_draft.version,
    'status', prepared_draft.status,
    'promptVersion', prepared_draft.prompt_version,
    'sourceSnapshotSha256',
      prepared_draft.source_snapshot_sha256,
    'sourceCount', source_count,
    'confidentialLegalDocumentCount',
      legal_document_count,
    'confidentialDocumentsOpened', false,
    'aiRequestCreated', false,
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
    'replayed', false
  );
end;
$function$;

revoke all on function
  public.prepare_property_unit_booking_agreement_advisory_draft(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  public.prepare_property_unit_booking_agreement_advisory_draft(
    uuid,
    uuid
  )
to service_role;

comment on function
  public.prepare_property_unit_booking_agreement_advisory_draft(
    uuid,
    uuid
  ) is
  'Creates an idempotent, advisory-only generation-pending agreement draft and binds canonical source hashes. It does not open confidential files, invoke AI, approve or execute an agreement, collect payment, sell inventory, or transfer title or ownership.';

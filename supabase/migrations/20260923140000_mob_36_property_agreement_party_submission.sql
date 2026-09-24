/*
 * MOB-36: Authenticated private agreement-party submission.
 *
 * Each authenticated buyer or owner may submit only their own structured
 * particulars. Identity evidence is represented only by a deliberately
 * masked reference. Raw identity numbers, files, storage paths and signed
 * URLs are forbidden.
 *
 * Submission does not:
 * - confirm the other party's particulars;
 * - generate or legally approve an agreement;
 * - provide legal advice;
 * - establish payment;
 * - execute, sign or register an agreement;
 * - change inventory, application, title or ownership.
 */

create or replace function
  public.submit_property_unit_booking_agreement_party_input (
    target_actor_user_id uuid,
    target_readiness_id uuid,
    target_party_input jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  action_time timestamptz := clock_timestamp();

  target_unit_id uuid;

  unit_record record;

  application_record
    public.property_unit_booking_applications%rowtype;

  readiness_record
    public.property_unit_booking_agreement_readiness%rowtype;

  party_record
    public.property_unit_booking_agreement_party_inputs%rowtype;

  updated_party
    public.property_unit_booking_agreement_party_inputs%rowtype;

  expected_party_role text;

  normalized_legal_name text;
  normalized_relation_type text;
  normalized_relation_name text;

  normalized_address_line_1 text;
  normalized_address_line_2 text;
  normalized_village_or_locality text;
  normalized_post_office text;
  normalized_police_station text;
  normalized_block_or_municipality text;
  normalized_district text;
  normalized_state text;
  normalized_pincode text;

  normalized_identity_document_type text;
  normalized_identity_masked_reference text;
  normalized_authority_capacity text;

  consent_accepted boolean;
begin
  if target_actor_user_id is null then
    raise exception 'AGREEMENT_ACTOR_REQUIRED'
      using errcode = '22023';
  end if;

  if target_readiness_id is null then
    raise exception 'AGREEMENT_READINESS_ID_INVALID'
      using errcode = '22023';
  end if;

  if target_party_input is null
     or jsonb_typeof(target_party_input) <> 'object' then
    raise exception 'AGREEMENT_PARTY_INPUT_INVALID'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(target_party_input) as supplied_key
    where supplied_key not in (
      'legalName',
      'relationType',
      'relationName',
      'addressLine1',
      'addressLine2',
      'villageOrLocality',
      'postOffice',
      'policeStation',
      'blockOrMunicipality',
      'district',
      'state',
      'pincode',
      'identityDocumentType',
      'identityMaskedReference',
      'authorityCapacity',
      'inputVersion',
      'consentAccepted'
    )
  ) then
    raise exception 'AGREEMENT_PARTY_INPUT_FIELD_INVALID'
      using errcode = '22023';
  end if;

  if coalesce(target_party_input->>'inputVersion', '')
     <> 'property-agreement-party-input-v1' then
    raise exception 'AGREEMENT_PARTY_INPUT_VERSION_INVALID'
      using errcode = '22023';
  end if;

  consent_accepted :=
    coalesce((target_party_input->>'consentAccepted')::boolean, false);

  if consent_accepted is distinct from true then
    raise exception 'AGREEMENT_PARTY_CONSENT_REQUIRED'
      using errcode = '22023';
  end if;

  normalized_legal_name :=
    nullif(btrim(target_party_input->>'legalName'), '');

  normalized_relation_type :=
    nullif(lower(btrim(target_party_input->>'relationType')), '');

  normalized_relation_name :=
    nullif(btrim(target_party_input->>'relationName'), '');

  normalized_address_line_1 :=
    nullif(btrim(target_party_input->>'addressLine1'), '');

  normalized_address_line_2 :=
    nullif(btrim(target_party_input->>'addressLine2'), '');

  normalized_village_or_locality :=
    nullif(btrim(target_party_input->>'villageOrLocality'), '');

  normalized_post_office :=
    nullif(btrim(target_party_input->>'postOffice'), '');

  normalized_police_station :=
    nullif(btrim(target_party_input->>'policeStation'), '');

  normalized_block_or_municipality :=
    nullif(btrim(target_party_input->>'blockOrMunicipality'), '');

  normalized_district :=
    nullif(btrim(target_party_input->>'district'), '');

  normalized_state :=
    nullif(btrim(target_party_input->>'state'), '');

  normalized_pincode :=
    nullif(btrim(target_party_input->>'pincode'), '');

  normalized_identity_document_type :=
    nullif(
      lower(btrim(target_party_input->>'identityDocumentType')),
      ''
    );

  normalized_identity_masked_reference :=
    nullif(
      btrim(target_party_input->>'identityMaskedReference'),
      ''
    );

  normalized_authority_capacity :=
    nullif(btrim(target_party_input->>'authorityCapacity'), '');

  if normalized_legal_name is null
     or char_length(normalized_legal_name) > 200 then
    raise exception 'AGREEMENT_LEGAL_NAME_INVALID'
      using errcode = '22023';
  end if;

  if normalized_relation_type is not null
     and normalized_relation_type not in (
       'father',
       'mother',
       'spouse',
       'guardian',
       'authorized_representative'
     ) then
    raise exception 'AGREEMENT_RELATION_TYPE_INVALID'
      using errcode = '22023';
  end if;

  if normalized_relation_type is not null
     and normalized_relation_name is null then
    raise exception 'AGREEMENT_RELATION_NAME_REQUIRED'
      using errcode = '22023';
  end if;

  if normalized_relation_type is null
     and normalized_relation_name is not null then
    raise exception 'AGREEMENT_RELATION_TYPE_REQUIRED'
      using errcode = '22023';
  end if;

  if normalized_relation_name is not null
     and char_length(normalized_relation_name) > 200 then
    raise exception 'AGREEMENT_RELATION_NAME_INVALID'
      using errcode = '22023';
  end if;

  if normalized_address_line_1 is null
     or char_length(normalized_address_line_1) > 300 then
    raise exception 'AGREEMENT_ADDRESS_INVALID'
      using errcode = '22023';
  end if;

  if normalized_address_line_2 is not null
     and char_length(normalized_address_line_2) > 300 then
    raise exception 'AGREEMENT_ADDRESS_INVALID'
      using errcode = '22023';
  end if;

  if normalized_village_or_locality is not null
     and char_length(normalized_village_or_locality) > 160 then
    raise exception 'AGREEMENT_LOCALITY_INVALID'
      using errcode = '22023';
  end if;

  if normalized_post_office is not null
     and char_length(normalized_post_office) > 160 then
    raise exception 'AGREEMENT_POST_OFFICE_INVALID'
      using errcode = '22023';
  end if;

  if normalized_police_station is not null
     and char_length(normalized_police_station) > 160 then
    raise exception 'AGREEMENT_POLICE_STATION_INVALID'
      using errcode = '22023';
  end if;

  if normalized_block_or_municipality is not null
     and char_length(normalized_block_or_municipality) > 160 then
    raise exception 'AGREEMENT_BLOCK_OR_MUNICIPALITY_INVALID'
      using errcode = '22023';
  end if;

  if normalized_district is null
     or char_length(normalized_district) > 160 then
    raise exception 'AGREEMENT_DISTRICT_INVALID'
      using errcode = '22023';
  end if;

  if normalized_state is null
     or char_length(normalized_state) > 160 then
    raise exception 'AGREEMENT_STATE_INVALID'
      using errcode = '22023';
  end if;

  if normalized_pincode is null
     or normalized_pincode !~ '^[0-9]{6}$' then
    raise exception 'AGREEMENT_PINCODE_INVALID'
      using errcode = '22023';
  end if;

  if normalized_identity_document_type not in (
    'pan',
    'aadhaar',
    'voter_id',
    'passport',
    'driving_licence',
    'company_registration',
    'other'
  ) then
    raise exception 'AGREEMENT_IDENTITY_TYPE_INVALID'
      using errcode = '22023';
  end if;

  /*
   * A masked reference must visibly contain masking characters.
   * Full Aadhaar-like numbers and other long unmasked numeric sequences are
   * rejected before they can reach the private table.
   */
  if normalized_identity_masked_reference is null
     or char_length(normalized_identity_masked_reference)
       not between 4 and 80
     or normalized_identity_masked_reference !~ '[*xX]'
     or normalized_identity_masked_reference ~ '[0-9]{8,}' then
    raise exception 'AGREEMENT_IDENTITY_REFERENCE_NOT_MASKED'
      using errcode = '22023';
  end if;

  if normalized_authority_capacity is not null
     and char_length(normalized_authority_capacity) > 200 then
    raise exception 'AGREEMENT_AUTHORITY_CAPACITY_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve only the immutable unit reference before locking.
   * Canonical lock order:
   *   unit -> application -> readiness -> party input.
   */
  select readiness.unit_id
  into target_unit_id
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.id = target_readiness_id;

  if target_unit_id is null then
    raise exception 'AGREEMENT_READINESS_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.status,
    builder.owner_user_id
  into unit_record
  from public.builder_inventory_units unit
  join public.builder_projects project
    on project.id = unit.project_id
  join public.builder_profiles builder
    on builder.id = project.builder_profile_id
  where unit.id = target_unit_id
  for update of unit;

  if unit_record.id is null then
    raise exception 'UNIT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select application.*
  into application_record
  from public.property_unit_booking_applications application
  join public.property_unit_booking_agreement_readiness readiness
    on readiness.application_id = application.id
  where readiness.id = target_readiness_id
  for update of application;

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

  if target_actor_user_id = readiness_record.buyer_user_id then
    expected_party_role := 'buyer';
  elsif target_actor_user_id = readiness_record.owner_user_id then
    expected_party_role := 'owner';
  else
    raise exception 'AGREEMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  select party_input.*
  into party_record
  from public.property_unit_booking_agreement_party_inputs party_input
  where party_input.readiness_id = readiness_record.id
    and party_input.party_role = expected_party_role
  for update;

  if party_record.id is null then
    raise exception 'AGREEMENT_PARTY_INPUT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if readiness_record.application_id <> application_record.id
     or readiness_record.unit_id <> unit_record.id
     or readiness_record.project_id <> unit_record.project_id
     or application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id
     or readiness_record.hold_id <> application_record.hold_id
     or readiness_record.buyer_user_id
       <> application_record.buyer_user_id
     or readiness_record.owner_user_id
       <> application_record.owner_user_id
     or unit_record.owner_user_id
       <> application_record.owner_user_id
     or party_record.party_user_id <> target_actor_user_id
     or party_record.party_role <> expected_party_role then
    raise exception 'AGREEMENT_PARTY_BINDING_INVALID'
      using errcode = '42501';
  end if;

  /*
   * Exact submission replay is idempotent, including after a later
   * confirmation. No private particulars are returned.
   */
  if party_record.status in ('submitted', 'confirmed')
     and party_record.legal_name
       is not distinct from normalized_legal_name
     and party_record.relation_type
       is not distinct from normalized_relation_type
     and party_record.relation_name
       is not distinct from normalized_relation_name
     and party_record.address_line_1
       is not distinct from normalized_address_line_1
     and party_record.address_line_2
       is not distinct from normalized_address_line_2
     and party_record.village_or_locality
       is not distinct from normalized_village_or_locality
     and party_record.post_office
       is not distinct from normalized_post_office
     and party_record.police_station
       is not distinct from normalized_police_station
     and party_record.block_or_municipality
       is not distinct from normalized_block_or_municipality
     and party_record.district
       is not distinct from normalized_district
     and party_record.state
       is not distinct from normalized_state
     and party_record.pincode
       is not distinct from normalized_pincode
     and party_record.identity_document_type
       is not distinct from normalized_identity_document_type
     and party_record.identity_masked_reference
       is not distinct from normalized_identity_masked_reference
     and party_record.authority_capacity
       is not distinct from normalized_authority_capacity
     and party_record.consent_accepted
     and party_record.consent_accepted_at is not null then
    return jsonb_build_object(
      'readinessId', readiness_record.id,
      'applicationId', readiness_record.application_id,
      'partyRole', expected_party_role,
      'status', party_record.status,
      'submittedAt', party_record.submitted_at,
      'confirmedAt', party_record.confirmed_at,
      'replayed', true
    );
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '55000';
  end if;

  if application_record.accepted_until is null
     or application_record.accepted_until <= action_time
     or readiness_record.expires_at is null
     or readiness_record.expires_at <= action_time then
    raise exception 'APPLICATION_ACCEPTANCE_EXPIRED'
      using errcode = '55000';
  end if;

  if unit_record.status::text <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '55000';
  end if;

  if readiness_record.status not in (
    'collecting_details',
    'changes_requested'
  ) then
    raise exception 'AGREEMENT_PARTY_SUBMISSION_CONFLICT'
      using errcode = '55000';
  end if;

  if party_record.status = 'confirmed' then
    raise exception 'AGREEMENT_PARTY_ALREADY_CONFIRMED'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_agreement_party_inputs
  set
    status = 'submitted',
    legal_name = normalized_legal_name,
    relation_type = normalized_relation_type,
    relation_name = normalized_relation_name,
    address_line_1 = normalized_address_line_1,
    address_line_2 = normalized_address_line_2,
    village_or_locality = normalized_village_or_locality,
    post_office = normalized_post_office,
    police_station = normalized_police_station,
    block_or_municipality =
      normalized_block_or_municipality,
    district = normalized_district,
    state = normalized_state,
    pincode = normalized_pincode,
    identity_document_type =
      normalized_identity_document_type,
    identity_masked_reference =
      normalized_identity_masked_reference,
    authority_capacity = normalized_authority_capacity,
    input_version = 'property-agreement-party-input-v1',
    consent_accepted = true,
    consent_accepted_at = action_time,
    submitted_at = action_time,
    confirmed_at = null,
    updated_at = action_time
  where id = party_record.id
    and status in (
      'incomplete',
      'submitted',
      'changes_requested'
    )
  returning * into updated_party;

  if updated_party.id is null then
    raise exception 'AGREEMENT_PARTY_SUBMISSION_CONFLICT'
      using errcode = '40001';
  end if;

  insert into public.property_unit_booking_agreement_events (
    readiness_id,
    application_id,
    event_kind,
    actor_role,
    event_payload_json,
    occurred_at
  )
  values (
    readiness_record.id,
    readiness_record.application_id,
    case
      when expected_party_role = 'buyer'
        then 'buyer_details_submitted'
      else 'owner_details_submitted'
    end,
    expected_party_role,
    jsonb_build_object(
      'inputVersion', updated_party.input_version,
      'maskedIdentityReferenceOnly', true,
      'rawIdentityStored', false,
      'confidentialDocumentOpened', false,
      'aiDraftGenerated', false,
      'agreementExecutionAllowed', false,
      'createsPayment', false,
      'marksInventorySold', false,
      'transfersTitle', false,
      'transfersOwnership', false
    ),
    action_time
  );

  return jsonb_build_object(
    'readinessId', readiness_record.id,
    'applicationId', readiness_record.application_id,
    'partyRole', expected_party_role,
    'status', updated_party.status,
    'submittedAt', updated_party.submitted_at,
    'confirmedAt', updated_party.confirmed_at,
    'replayed', false
  );
end;
$$;

revoke all on function
  public.submit_property_unit_booking_agreement_party_input(
    uuid,
    uuid,
    jsonb
  )
from public, anon, authenticated;

grant execute on function
  public.submit_property_unit_booking_agreement_party_input(
    uuid,
    uuid,
    jsonb
  )
to service_role;

comment on function
  public.submit_property_unit_booking_agreement_party_input(
    uuid,
    uuid,
    jsonb
  ) is
  'Allows the authenticated buyer or owner to submit only their own structured private agreement particulars using a visibly masked identity reference. It stores no raw identity document, creates no legal agreement or payment, changes no inventory, and transfers no title or ownership.';

/*
 * MOB-36: Canonical private property-agreement readiness creation.
 *
 * This authority:
 * - is available only to the accepted application's buyer or owner;
 * - locks the inventory unit before dependent transaction records;
 * - validates the converted hold and accepted application;
 * - snapshots canonical server-owned unit, pricing and legal-profile facts;
 * - requires all four declared property boundaries;
 * - creates empty private buyer and owner input records;
 * - is idempotent for one application;
 * - never opens or copies a confidential legal document;
 * - never generates, signs, registers or executes an agreement;
 * - never collects or proves payment;
 * - never changes inventory, application, title or ownership.
 */

create or replace function
  public.create_property_unit_booking_agreement_readiness (
    target_actor_user_id uuid,
    target_application_id uuid
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

  hold_record
    public.property_unit_booking_holds%rowtype;

  project_record
    public.builder_projects%rowtype;

  pricing_record record;

  existing_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  created_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  legal_profile
    public.property_unit_legal_profiles%rowtype;

  linked_advance_request_id uuid;
  quoted_price_paise bigint;
  actor_role_value text;
  address_snapshot text;
begin
  if target_actor_user_id is null then
    raise exception 'AGREEMENT_ACTOR_REQUIRED'
      using errcode = '22023';
  end if;

  if target_application_id is null then
    raise exception 'APPLICATION_ID_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve only the immutable unit reference before locking.
   * Canonical lock order is:
   *   unit -> application -> hold -> readiness.
   */
  select application.unit_id
  into target_unit_id
  from public.property_unit_booking_applications application
  where application.id = target_application_id;

  if target_unit_id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    unit.id,
    unit.project_id,
    unit.unit_code,
    unit.title,
    unit.unit_kind,
    unit.floor_no,
    unit.unit_no,
    unit.facing,
    unit.status,
    unit.plot_area_sqft,
    unit.built_up_sqft,
    unit.carpet_sqft,
    unit.super_built_up_sqft,
    unit.dimension_length_ft,
    unit.dimension_width_ft,
    unit.boundary_north,
    unit.boundary_south,
    unit.boundary_east,
    unit.boundary_west,
    unit.boundary_demarcation_type,
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
  where application.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'APPLICATION_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select hold_row.*
  into hold_record
  from public.property_unit_booking_holds hold_row
  where hold_row.id = application_record.hold_id
  for update;

  if hold_record.id is null then
    raise exception 'HOLD_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select readiness.*
  into existing_readiness
  from public.property_unit_booking_agreement_readiness readiness
  where readiness.application_id = application_record.id
  for update;

  if target_actor_user_id = application_record.buyer_user_id then
    actor_role_value := 'buyer';
  elsif target_actor_user_id = application_record.owner_user_id then
    actor_role_value := 'owner';
  else
    raise exception 'AGREEMENT_ACCESS_FORBIDDEN'
      using errcode = '42501';
  end if;

  if unit_record.owner_user_id <> application_record.owner_user_id then
    raise exception 'AGREEMENT_OWNER_BINDING_INVALID'
      using errcode = '42501';
  end if;

  if application_record.unit_id <> unit_record.id
     or application_record.project_id <> unit_record.project_id
     or application_record.hold_id <> hold_record.id
     or hold_record.unit_id <> unit_record.id
     or hold_record.project_id <> unit_record.project_id
     or hold_record.buyer_user_id
       <> application_record.buyer_user_id
     or hold_record.owner_user_id
       <> application_record.owner_user_id then
    raise exception 'AGREEMENT_BINDING_INVALID'
      using errcode = '42501';
  end if;

  /*
   * Exact replay returns the existing private workspace.
   * The response deliberately excludes party identities, raw identity data,
   * legal-document paths and payment evidence.
   */
  if existing_readiness.id is not null then
    if existing_readiness.hold_id <> hold_record.id
       or existing_readiness.unit_id <> unit_record.id
       or existing_readiness.project_id <> unit_record.project_id
       or existing_readiness.buyer_user_id
         <> application_record.buyer_user_id
       or existing_readiness.owner_user_id
         <> application_record.owner_user_id then
      raise exception 'AGREEMENT_READINESS_BINDING_CONFLICT'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'id', existing_readiness.id,
      'applicationId', existing_readiness.application_id,
      'holdId', existing_readiness.hold_id,
      'unitId', existing_readiness.unit_id,
      'projectId', existing_readiness.project_id,
      'advanceRequestId',
        existing_readiness.advance_request_id,
      'status', existing_readiness.status,
      'readinessVersion',
        existing_readiness.readiness_version,
      'unitCode', existing_readiness.unit_code_snapshot,
      'unitTitle', existing_readiness.unit_title_snapshot,
      'unitKind', existing_readiness.unit_kind_snapshot,
      'projectName',
        existing_readiness.project_name_snapshot,
      'quotedPropertyPricePaise',
        existing_readiness.quoted_property_price_paise,
      'currency', existing_readiness.currency,
      'expiresAt', existing_readiness.expires_at,
      'replayed', true
    );
  end if;

  if application_record.status <> 'accepted' then
    raise exception 'APPLICATION_NOT_ACCEPTED'
      using errcode = '55000';
  end if;

  if application_record.accepted_until is null
     or application_record.accepted_until <= action_time then
    raise exception 'APPLICATION_ACCEPTANCE_EXPIRED'
      using errcode = '55000';
  end if;

  if unit_record.status::text <> 'reserved' then
    raise exception 'UNIT_NOT_RESERVED'
      using errcode = '55000';
  end if;

  if hold_record.status <> 'converted'
     or hold_record.conversion_reference_type
       <> 'property_unit_booking_application'
     or hold_record.conversion_reference_id
       <> application_record.id then
    raise exception 'HOLD_APPLICATION_BINDING_INVALID'
      using errcode = '55000';
  end if;

  if nullif(btrim(unit_record.unit_code), '') is null
     or nullif(btrim(unit_record.unit_kind::text), '') is null then
    raise exception 'PROPERTY_SCHEDULE_INCOMPLETE'
      using errcode = '55000';
  end if;

  if nullif(btrim(unit_record.boundary_north), '') is null
     or nullif(btrim(unit_record.boundary_south), '') is null
     or nullif(btrim(unit_record.boundary_east), '') is null
     or nullif(btrim(unit_record.boundary_west), '') is null then
    raise exception 'PROPERTY_BOUNDARIES_INCOMPLETE'
      using errcode = '55000';
  end if;

  select project.*
  into project_record
  from public.builder_projects project
  where project.id = unit_record.project_id;

  if project_record.id is null then
    raise exception 'PROJECT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  select
    pricing.price_total,
    pricing.updated_at
  into pricing_record
  from public.builder_inventory_pricing pricing
  where pricing.unit_id = unit_record.id;

  if pricing_record.price_total is null
     or pricing_record.price_total <= 0 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '55000';
  end if;

  quoted_price_paise :=
    round(pricing_record.price_total * 100)::bigint;

  if quoted_price_paise < 1 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '55000';
  end if;

  /*
   * Read only the structured legal-profile identifiers.
   * No legal document, storage path, signed URL, extracted content or AI
   * analysis is opened or copied by this authority.
   */
  select profile.*
  into legal_profile
  from public.property_unit_legal_profiles profile
  where profile.unit_id = unit_record.id;

  select advance_request.id
  into linked_advance_request_id
  from public.property_unit_booking_advance_requests advance_request
  where advance_request.application_id = application_record.id
    and advance_request.hold_id = hold_record.id
    and advance_request.unit_id = unit_record.id
    and advance_request.project_id = unit_record.project_id
    and advance_request.buyer_user_id
      = application_record.buyer_user_id
    and advance_request.owner_user_id
      = application_record.owner_user_id
  limit 1;

  address_snapshot := nullif(
    concat_ws(
      ', ',
      nullif(btrim(project_record.city), ''),
      nullif(btrim(project_record.district), ''),
      nullif(btrim(project_record.state), ''),
      nullif(btrim(project_record.pincode), '')
    ),
    ''
  );

  insert into
    public.property_unit_booking_agreement_readiness (
      application_id,
      hold_id,
      unit_id,
      project_id,
      buyer_user_id,
      owner_user_id,
      advance_request_id,
      status,
      readiness_version,
      unit_code_snapshot,
      unit_title_snapshot,
      unit_kind_snapshot,
      project_name_snapshot,
      quoted_property_price_paise,
      currency,
      plot_area_sqft,
      built_up_sqft,
      carpet_sqft,
      super_built_up_sqft,
      dimension_length_ft,
      dimension_width_ft,
      floor_number_snapshot,
      unit_number_snapshot,
      facing_snapshot,
      boundary_north,
      boundary_south,
      boundary_east,
      boundary_west,
      boundary_demarcation_snapshot,
      plot_numbers_snapshot,
      deed_numbers_snapshot,
      mutation_numbers_snapshot,
      khatian_numbers_snapshot,
      property_address_snapshot,
      expires_at
    )
  values (
    application_record.id,
    hold_record.id,
    unit_record.id,
    unit_record.project_id,
    application_record.buyer_user_id,
    application_record.owner_user_id,
    linked_advance_request_id,
    'collecting_details',
    'property-agreement-readiness-v1',
    btrim(unit_record.unit_code),
    nullif(btrim(unit_record.title), ''),
    unit_record.unit_kind::text,
    nullif(btrim(project_record.name), ''),
    quoted_price_paise,
    'INR',
    unit_record.plot_area_sqft,
    unit_record.built_up_sqft,
    unit_record.carpet_sqft,
    unit_record.super_built_up_sqft,
    unit_record.dimension_length_ft,
    unit_record.dimension_width_ft,
    unit_record.floor_no,
    nullif(btrim(unit_record.unit_no), ''),
    nullif(btrim(unit_record.facing), ''),
    btrim(unit_record.boundary_north),
    btrim(unit_record.boundary_south),
    btrim(unit_record.boundary_east),
    btrim(unit_record.boundary_west),
    nullif(
      btrim(unit_record.boundary_demarcation_type),
      ''
    ),
    coalesce(legal_profile.plot_numbers, '{}'::text[]),
    coalesce(legal_profile.deed_numbers, '{}'::text[]),
    coalesce(legal_profile.mutation_numbers, '{}'::text[]),
    coalesce(legal_profile.khatian_numbers, '{}'::text[]),
    address_snapshot,
    application_record.accepted_until
  )
  returning * into created_readiness;

  if created_readiness.id is null then
    raise exception 'AGREEMENT_READINESS_CREATION_CONFLICT'
      using errcode = '40001';
  end if;

  insert into
    public.property_unit_booking_agreement_party_inputs (
      readiness_id,
      party_role,
      party_user_id,
      status
    )
  values
    (
      created_readiness.id,
      'buyer',
      application_record.buyer_user_id,
      'incomplete'
    ),
    (
      created_readiness.id,
      'owner',
      application_record.owner_user_id,
      'incomplete'
    );

  insert into public.property_unit_booking_agreement_events (
    readiness_id,
    application_id,
    event_kind,
    actor_role,
    event_payload_json,
    occurred_at
  )
  values (
    created_readiness.id,
    application_record.id,
    'readiness_created',
    actor_role_value,
    jsonb_build_object(
      'readinessVersion',
        created_readiness.readiness_version,
      'snapshotSource', 'canonical_server_records',
      'pricingSource', 'builder_inventory_pricing',
      'legalProfileIdentifiersOnly', true,
      'confidentialDocumentsOpened', false,
      'aiDraftGenerated', false,
      'lawyerReviewRequired', true,
      'agreementExecutionAllowed', false,
      'createsPayment', false,
      'marksInventorySold', false,
      'transfersTitle', false,
      'transfersOwnership', false
    ),
    action_time
  );

  return jsonb_build_object(
    'id', created_readiness.id,
    'applicationId', created_readiness.application_id,
    'holdId', created_readiness.hold_id,
    'unitId', created_readiness.unit_id,
    'projectId', created_readiness.project_id,
    'advanceRequestId',
      created_readiness.advance_request_id,
    'status', created_readiness.status,
    'readinessVersion',
      created_readiness.readiness_version,
    'unitCode', created_readiness.unit_code_snapshot,
    'unitTitle', created_readiness.unit_title_snapshot,
    'unitKind', created_readiness.unit_kind_snapshot,
    'projectName',
      created_readiness.project_name_snapshot,
    'quotedPropertyPricePaise',
      created_readiness.quoted_property_price_paise,
    'currency', created_readiness.currency,
    'expiresAt', created_readiness.expires_at,
    'replayed', false
  );
end;
$$;

revoke all on function
  public.create_property_unit_booking_agreement_readiness(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  public.create_property_unit_booking_agreement_readiness(
    uuid,
    uuid
  )
to service_role;

comment on function
  public.create_property_unit_booking_agreement_readiness(
    uuid,
    uuid
  ) is
  'Creates one private, idempotent, readiness-only property-agreement workspace from an accepted booking application. It snapshots canonical schedule and pricing facts, creates empty buyer and owner inputs, and performs no document access, AI drafting, payment, agreement execution, inventory sale, title transfer or ownership transfer.';

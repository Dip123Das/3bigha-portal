/*
 * MOB-36: Canonical property-schedule confirmation and readiness transition.
 *
 * Only the canonical owner may confirm the server-snapshotted property
 * schedule. Before confirmation, this authority revalidates:
 * - the accepted booking application and reserved unit;
 * - both parties' separately confirmed particulars;
 * - the server-owned property price;
 * - unit description, dimensions and all four boundaries;
 * - structured legal-profile identifiers only.
 *
 * The transition to ready_for_draft merely permits a later, separately
 * authorized advisory drafting step. It does not generate, approve, sign,
 * register or execute an agreement, establish payment, mark inventory sold,
 * or transfer title or ownership.
 */

create or replace function
  public.confirm_property_unit_booking_agreement_schedule (
    target_owner_user_id uuid,
    target_readiness_id uuid
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

  updated_readiness
    public.property_unit_booking_agreement_readiness%rowtype;

  project_record
    public.builder_projects%rowtype;

  legal_profile
    public.property_unit_legal_profiles%rowtype;

  pricing_record record;

  buyer_party_record
    public.property_unit_booking_agreement_party_inputs%rowtype;

  owner_party_record
    public.property_unit_booking_agreement_party_inputs%rowtype;

  current_price_paise bigint;
  current_address_snapshot text;
begin
  if target_owner_user_id is null then
    raise exception 'OWNER_REQUIRED'
      using errcode = '22023';
  end if;

  if target_readiness_id is null then
    raise exception 'AGREEMENT_READINESS_ID_INVALID'
      using errcode = '22023';
  end if;

  /*
   * Resolve only the immutable unit reference before locking.
   * Canonical lock order:
   *   unit -> application -> readiness -> buyer input -> owner input.
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

  select party_input.*
  into buyer_party_record
  from public.property_unit_booking_agreement_party_inputs party_input
  where party_input.readiness_id = readiness_record.id
    and party_input.party_role = 'buyer'
  for update;

  select party_input.*
  into owner_party_record
  from public.property_unit_booking_agreement_party_inputs party_input
  where party_input.readiness_id = readiness_record.id
    and party_input.party_role = 'owner'
  for update;

  if buyer_party_record.id is null
     or owner_party_record.id is null then
    raise exception 'AGREEMENT_PARTY_INPUT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if target_owner_user_id <> readiness_record.owner_user_id
     or target_owner_user_id <> application_record.owner_user_id
     or target_owner_user_id <> unit_record.owner_user_id then
    raise exception 'AGREEMENT_OWNER_ACCESS_FORBIDDEN'
      using errcode = '42501';
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
     or buyer_party_record.party_user_id
       <> readiness_record.buyer_user_id
     or owner_party_record.party_user_id
       <> readiness_record.owner_user_id then
    raise exception 'AGREEMENT_SCHEDULE_BINDING_INVALID'
      using errcode = '42501';
  end if;

  /*
   * Exact replay remains idempotent. Later advisory lifecycle states retain
   * the original property-schedule confirmation.
   */
  if readiness_record.property_schedule_confirmed_at is not null
     and readiness_record.ready_for_draft_at is not null
     and readiness_record.status in (
       'ready_for_draft',
       'draft_generated',
       'parties_reviewing',
       'changes_requested',
       'approved_for_execution'
     ) then
    return jsonb_build_object(
      'readinessId', readiness_record.id,
      'applicationId', readiness_record.application_id,
      'unitId', readiness_record.unit_id,
      'projectId', readiness_record.project_id,
      'status', readiness_record.status,
      'propertyScheduleConfirmedAt',
        readiness_record.property_schedule_confirmed_at,
      'readyForDraftAt',
        readiness_record.ready_for_draft_at,
      'buyerDetailsConfirmed',
        readiness_record.buyer_details_confirmed_at
          is not null,
      'ownerDetailsConfirmed',
        readiness_record.owner_details_confirmed_at
          is not null,
      'lawyerReviewRequired',
        readiness_record.lawyer_review_required,
      'aiDraftAdvisoryOnly',
        readiness_record.ai_draft_advisory_only,
      'agreementExecutionAllowed',
        readiness_record.agreement_execution_allowed,
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
    raise exception 'AGREEMENT_SCHEDULE_CONFIRMATION_CONFLICT'
      using errcode = '55000';
  end if;

  if buyer_party_record.status <> 'confirmed'
     or buyer_party_record.confirmed_at is null
     or owner_party_record.status <> 'confirmed'
     or owner_party_record.confirmed_at is null
     or readiness_record.buyer_details_confirmed_at is null
     or readiness_record.owner_details_confirmed_at is null then
    raise exception 'AGREEMENT_PARTIES_NOT_CONFIRMED'
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

  current_price_paise :=
    round(pricing_record.price_total * 100)::bigint;

  if current_price_paise < 1 then
    raise exception 'PROPERTY_PRICE_UNAVAILABLE'
      using errcode = '55000';
  end if;

  select profile.*
  into legal_profile
  from public.property_unit_legal_profiles profile
  where profile.unit_id = unit_record.id;

  current_address_snapshot := nullif(
    concat_ws(
      ', ',
      nullif(btrim(project_record.city), ''),
      nullif(btrim(project_record.district), ''),
      nullif(btrim(project_record.state), ''),
      nullif(btrim(project_record.pincode), '')
    ),
    ''
  );

  /*
   * Revalidate the complete server snapshot. A changed schedule must be
   * reviewed through a later explicitly authorized correction workflow.
   */
  if readiness_record.unit_code_snapshot
       is distinct from btrim(unit_record.unit_code)
     or readiness_record.unit_title_snapshot
       is distinct from nullif(btrim(unit_record.title), '')
     or readiness_record.unit_kind_snapshot
       is distinct from unit_record.unit_kind::text
     or readiness_record.project_name_snapshot
       is distinct from nullif(btrim(project_record.name), '')
     or readiness_record.quoted_property_price_paise
       is distinct from current_price_paise
     or readiness_record.currency <> 'INR'
     or readiness_record.plot_area_sqft
       is distinct from unit_record.plot_area_sqft
     or readiness_record.built_up_sqft
       is distinct from unit_record.built_up_sqft
     or readiness_record.carpet_sqft
       is distinct from unit_record.carpet_sqft
     or readiness_record.super_built_up_sqft
       is distinct from unit_record.super_built_up_sqft
     or readiness_record.dimension_length_ft
       is distinct from unit_record.dimension_length_ft
     or readiness_record.dimension_width_ft
       is distinct from unit_record.dimension_width_ft
     or readiness_record.floor_number_snapshot
       is distinct from unit_record.floor_no
     or readiness_record.unit_number_snapshot
       is distinct from nullif(btrim(unit_record.unit_no), '')
     or readiness_record.facing_snapshot
       is distinct from nullif(btrim(unit_record.facing), '')
     or readiness_record.boundary_north
       is distinct from btrim(unit_record.boundary_north)
     or readiness_record.boundary_south
       is distinct from btrim(unit_record.boundary_south)
     or readiness_record.boundary_east
       is distinct from btrim(unit_record.boundary_east)
     or readiness_record.boundary_west
       is distinct from btrim(unit_record.boundary_west)
     or readiness_record.boundary_demarcation_snapshot
       is distinct from nullif(
         btrim(unit_record.boundary_demarcation_type),
         ''
       )
     or readiness_record.plot_numbers_snapshot
       is distinct from coalesce(
         legal_profile.plot_numbers,
         '{}'::text[]
       )
     or readiness_record.deed_numbers_snapshot
       is distinct from coalesce(
         legal_profile.deed_numbers,
         '{}'::text[]
       )
     or readiness_record.mutation_numbers_snapshot
       is distinct from coalesce(
         legal_profile.mutation_numbers,
         '{}'::text[]
       )
     or readiness_record.khatian_numbers_snapshot
       is distinct from coalesce(
         legal_profile.khatian_numbers,
         '{}'::text[]
       )
     or readiness_record.property_address_snapshot
       is distinct from current_address_snapshot then
    raise exception 'PROPERTY_SCHEDULE_CHANGED'
      using errcode = '55000';
  end if;

  update public.property_unit_booking_agreement_readiness
  set
    status = 'ready_for_draft',
    property_schedule_confirmed_at = action_time,
    ready_for_draft_at = action_time,
    updated_at = action_time
  where id = readiness_record.id
    and status in (
      'collecting_details',
      'changes_requested'
    )
    and buyer_details_confirmed_at is not null
    and owner_details_confirmed_at is not null
    and property_schedule_confirmed_at is null
  returning * into updated_readiness;

  if updated_readiness.id is null then
    raise exception 'AGREEMENT_SCHEDULE_CONFIRMATION_CONFLICT'
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
  values
    (
      updated_readiness.id,
      updated_readiness.application_id,
      'property_schedule_confirmed',
      'owner',
      jsonb_build_object(
        'snapshotRevalidated', true,
        'serverOwnedPriceRevalidated', true,
        'allFourBoundariesConfirmed', true,
        'legalProfileIdentifiersOnly', true,
        'confidentialDocumentsOpened', false,
        'agreementExecutionAllowed', false,
        'createsPayment', false,
        'marksInventorySold', false,
        'transfersTitle', false,
        'transfersOwnership', false
      ),
      action_time
    ),
    (
      updated_readiness.id,
      updated_readiness.application_id,
      'ready_for_draft',
      'system',
      jsonb_build_object(
        'buyerDetailsConfirmed', true,
        'ownerDetailsConfirmed', true,
        'propertyScheduleConfirmed', true,
        'lawyerReviewRequired', true,
        'aiDraftAdvisoryOnly', true,
        'draftGenerated', false,
        'agreementApproved', false,
        'agreementExecuted', false,
        'paymentEstablished', false
      ),
      action_time
    );

  return jsonb_build_object(
    'readinessId', updated_readiness.id,
    'applicationId', updated_readiness.application_id,
    'unitId', updated_readiness.unit_id,
    'projectId', updated_readiness.project_id,
    'status', updated_readiness.status,
    'propertyScheduleConfirmedAt',
      updated_readiness.property_schedule_confirmed_at,
    'readyForDraftAt',
      updated_readiness.ready_for_draft_at,
    'buyerDetailsConfirmed', true,
    'ownerDetailsConfirmed', true,
    'lawyerReviewRequired',
      updated_readiness.lawyer_review_required,
    'aiDraftAdvisoryOnly',
      updated_readiness.ai_draft_advisory_only,
    'agreementExecutionAllowed',
      updated_readiness.agreement_execution_allowed,
    'replayed', false
  );
end;
$$;

revoke all on function
  public.confirm_property_unit_booking_agreement_schedule(
    uuid,
    uuid
  )
from public, anon, authenticated;

grant execute on function
  public.confirm_property_unit_booking_agreement_schedule(
    uuid,
    uuid
  )
to service_role;

comment on function
  public.confirm_property_unit_booking_agreement_schedule(
    uuid,
    uuid
  ) is
  'Allows only the canonical owner to confirm a fully revalidated server-owned property schedule after both parties confirm their own particulars. It transitions only to advisory draft readiness and does not open documents, generate or execute an agreement, establish payment, alter inventory, or transfer title or ownership.';

/*
 * MOB-36: Private property-agreement readiness and party-input foundation.
 *
 * This schema stores:
 * - one private readiness workspace for an accepted booking application;
 * - an immutable-style property schedule snapshot with all four boundaries;
 * - separately confirmed buyer and owner particulars;
 * - private lifecycle audit events.
 *
 * It does not:
 * - read or copy confidential legal-document contents;
 * - generate a legally final agreement;
 * - provide legal advice or establish title validity;
 * - sign, register or execute an agreement;
 * - collect or prove payment;
 * - mark inventory booked or sold;
 * - transfer title, possession or ownership.
 */

create table if not exists
  public.property_unit_booking_agreement_readiness (
    id uuid primary key default gen_random_uuid(),

    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,

    hold_id uuid not null
      references public.property_unit_booking_holds(id)
      on delete restrict,

    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,

    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,

    buyer_user_id uuid not null
      references auth.users(id)
      on delete restrict,

    owner_user_id uuid not null
      references auth.users(id)
      on delete restrict,

    advance_request_id uuid
      references public.property_unit_booking_advance_requests(id)
      on delete restrict,

    status text not null default 'collecting_details'
      check (
        status in (
          'collecting_details',
          'ready_for_draft',
          'draft_generated',
          'parties_reviewing',
          'changes_requested',
          'approved_for_execution',
          'cancelled',
          'expired'
        )
      ),

    readiness_version text not null
      default 'property-agreement-readiness-v1'
      check (
        readiness_version =
          'property-agreement-readiness-v1'
      ),

    unit_code_snapshot text not null,
    unit_title_snapshot text,
    unit_kind_snapshot text not null,

    project_name_snapshot text,

    quoted_property_price_paise bigint not null
      check (quoted_property_price_paise > 0),

    currency text not null default 'INR'
      check (currency = 'INR'),

    plot_area_sqft numeric(18,4),
    built_up_sqft numeric(18,4),
    carpet_sqft numeric(18,4),
    super_built_up_sqft numeric(18,4),

    dimension_length_ft numeric(18,4),
    dimension_width_ft numeric(18,4),

    floor_number_snapshot integer,
    unit_number_snapshot text,
    facing_snapshot text,

    boundary_north text not null,
    boundary_south text not null,
    boundary_east text not null,
    boundary_west text not null,

    boundary_demarcation_snapshot text,

    plot_numbers_snapshot text[] not null default '{}',
    deed_numbers_snapshot text[] not null default '{}',
    mutation_numbers_snapshot text[] not null default '{}',
    khatian_numbers_snapshot text[] not null default '{}',

    property_address_snapshot text,

    print_page_size text not null default 'A4'
      check (
        print_page_size in (
          'A4',
          'LEGAL',
          'CUSTOM_STAMP_PAPER'
        )
      ),

    print_orientation text not null default 'portrait'
      check (print_orientation = 'portrait'),

    print_margin_top_mm numeric(8,2) not null default 25
      check (print_margin_top_mm between 0 and 100),

    print_margin_right_mm numeric(8,2) not null default 20
      check (print_margin_right_mm between 0 and 100),

    print_margin_bottom_mm numeric(8,2) not null default 25
      check (print_margin_bottom_mm between 0 and 100),

    print_margin_left_mm numeric(8,2) not null default 20
      check (print_margin_left_mm between 0 and 100),

    custom_page_width_mm numeric(8,2),
    custom_page_height_mm numeric(8,2),

    lawyer_review_required boolean not null default true
      check (lawyer_review_required),

    ai_draft_advisory_only boolean not null default true
      check (ai_draft_advisory_only),

    payment_required_before_execution boolean not null default true
      check (payment_required_before_execution),

    agreement_execution_allowed boolean not null default false
      check (not agreement_execution_allowed),

    creates_payment boolean not null default false
      check (not creates_payment),

    marks_inventory_sold boolean not null default false
      check (not marks_inventory_sold),

    transfers_title boolean not null default false
      check (not transfers_title),

    transfers_ownership boolean not null default false
      check (not transfers_ownership),

    buyer_details_confirmed_at timestamptz,
    owner_details_confirmed_at timestamptz,
    property_schedule_confirmed_at timestamptz,

    ready_for_draft_at timestamptz,
    cancelled_at timestamptz,
    expires_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint property_agreement_distinct_parties check (
      buyer_user_id <> owner_user_id
    ),

    constraint property_agreement_one_per_application
      unique (application_id),

    constraint property_agreement_unit_code_nonblank check (
      nullif(btrim(unit_code_snapshot), '') is not null
    ),

    constraint property_agreement_unit_kind_nonblank check (
      nullif(btrim(unit_kind_snapshot), '') is not null
    ),

    constraint property_agreement_boundaries_nonblank check (
      nullif(btrim(boundary_north), '') is not null
      and nullif(btrim(boundary_south), '') is not null
      and nullif(btrim(boundary_east), '') is not null
      and nullif(btrim(boundary_west), '') is not null
    ),

    constraint property_agreement_area_values_positive check (
      (plot_area_sqft is null or plot_area_sqft > 0)
      and (built_up_sqft is null or built_up_sqft > 0)
      and (carpet_sqft is null or carpet_sqft > 0)
      and (
        super_built_up_sqft is null
        or super_built_up_sqft > 0
      )
    ),

    constraint property_agreement_dimension_values_positive check (
      (
        dimension_length_ft is null
        or dimension_length_ft > 0
      )
      and (
        dimension_width_ft is null
        or dimension_width_ft > 0
      )
    ),

    constraint property_agreement_custom_page_dimensions check (
      (
        print_page_size <> 'CUSTOM_STAMP_PAPER'
        and custom_page_width_mm is null
        and custom_page_height_mm is null
      )
      or (
        print_page_size = 'CUSTOM_STAMP_PAPER'
        and custom_page_width_mm between 100 and 500
        and custom_page_height_mm between 100 and 700
      )
    ),

    constraint property_agreement_snapshot_array_limits check (
      cardinality(plot_numbers_snapshot) <= 100
      and cardinality(deed_numbers_snapshot) <= 100
      and cardinality(mutation_numbers_snapshot) <= 100
      and cardinality(khatian_numbers_snapshot) <= 100
    ),

    constraint property_agreement_ready_requires_confirmations check (
      status not in (
        'ready_for_draft',
        'draft_generated',
        'parties_reviewing',
        'changes_requested',
        'approved_for_execution'
      )
      or (
        buyer_details_confirmed_at is not null
        and owner_details_confirmed_at is not null
        and property_schedule_confirmed_at is not null
        and ready_for_draft_at is not null
      )
    ),

    constraint property_agreement_cancelled_timestamp check (
      status <> 'cancelled'
      or cancelled_at is not null
    )
  );

create index if not exists
  property_agreement_readiness_unit_status_idx
on public.property_unit_booking_agreement_readiness(
  unit_id,
  status,
  updated_at desc
);

create index if not exists
  property_agreement_readiness_buyer_idx
on public.property_unit_booking_agreement_readiness(
  buyer_user_id,
  updated_at desc
);

create index if not exists
  property_agreement_readiness_owner_idx
on public.property_unit_booking_agreement_readiness(
  owner_user_id,
  updated_at desc
);

create table if not exists
  public.property_unit_booking_agreement_party_inputs (
    id uuid primary key default gen_random_uuid(),

    readiness_id uuid not null
      references
        public.property_unit_booking_agreement_readiness(id)
      on delete restrict,

    party_role text not null
      check (party_role in ('buyer', 'owner')),

    party_user_id uuid not null
      references auth.users(id)
      on delete restrict,

    status text not null default 'incomplete'
      check (
        status in (
          'incomplete',
          'submitted',
          'confirmed',
          'changes_requested'
        )
      ),

    legal_name text,
    relation_type text
      check (
        relation_type is null
        or relation_type in (
          'father',
          'mother',
          'spouse',
          'guardian',
          'authorized_representative'
        )
      ),

    relation_name text,

    address_line_1 text,
    address_line_2 text,
    village_or_locality text,
    post_office text,
    police_station text,
    block_or_municipality text,
    district text,
    state text,
    pincode text,

    identity_document_type text
      check (
        identity_document_type is null
        or identity_document_type in (
          'pan',
          'aadhaar',
          'voter_id',
          'passport',
          'driving_licence',
          'company_registration',
          'other'
        )
      ),

    identity_masked_reference text,

    authority_capacity text,

    input_version text not null
      default 'property-agreement-party-input-v1'
      check (
        input_version =
          'property-agreement-party-input-v1'
      ),

    consent_accepted boolean not null default false,
    consent_accepted_at timestamptz,

    submitted_at timestamptz,
    confirmed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint property_agreement_party_unique
      unique (readiness_id, party_role),

    constraint property_agreement_party_pincode check (
      pincode is null
      or pincode ~ '^[0-9]{6}$'
    ),

    constraint property_agreement_identity_masked check (
      identity_masked_reference is null
      or (
        char_length(identity_masked_reference)
          between 4 and 80
        and identity_masked_reference !~
          '^[0-9]{12}$'
      )
    ),

    constraint property_agreement_consent_alignment check (
      (
        not consent_accepted
        and consent_accepted_at is null
      )
      or (
        consent_accepted
        and consent_accepted_at is not null
      )
    ),

    constraint property_agreement_party_submission check (
      status = 'incomplete'
      or (
        nullif(btrim(legal_name), '') is not null
        and nullif(btrim(address_line_1), '') is not null
        and nullif(btrim(district), '') is not null
        and nullif(btrim(state), '') is not null
        and pincode ~ '^[0-9]{6}$'
        and consent_accepted
        and consent_accepted_at is not null
        and submitted_at is not null
      )
    ),

    constraint property_agreement_party_confirmation check (
      status <> 'confirmed'
      or confirmed_at is not null
    )
  );

create index if not exists
  property_agreement_party_user_idx
on public.property_unit_booking_agreement_party_inputs(
  party_user_id,
  updated_at desc
);

create table if not exists
  public.property_unit_booking_agreement_events (
    id uuid primary key default gen_random_uuid(),

    readiness_id uuid not null
      references
        public.property_unit_booking_agreement_readiness(id)
      on delete restrict,

    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,

    event_kind text not null
      check (
        event_kind in (
          'readiness_created',
          'buyer_details_submitted',
          'owner_details_submitted',
          'buyer_details_confirmed',
          'owner_details_confirmed',
          'property_schedule_confirmed',
          'ready_for_draft',
          'draft_generated',
          'draft_viewed',
          'changes_requested',
          'approved_for_execution',
          'readiness_cancelled',
          'readiness_expired'
        )
      ),

    actor_role text not null
      check (
        actor_role in (
          'buyer',
          'owner',
          'system',
          'legal_reviewer'
        )
      ),

    event_payload_json jsonb not null default '{}'::jsonb,

    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now()
  );

create index if not exists
  property_agreement_events_readiness_idx
on public.property_unit_booking_agreement_events(
  readiness_id,
  occurred_at,
  id
);

alter table
  public.property_unit_booking_agreement_readiness
  enable row level security;

alter table
  public.property_unit_booking_agreement_party_inputs
  enable row level security;

alter table
  public.property_unit_booking_agreement_events
  enable row level security;

revoke all on
  public.property_unit_booking_agreement_readiness
from public, anon, authenticated;

revoke all on
  public.property_unit_booking_agreement_party_inputs
from public, anon, authenticated;

revoke all on
  public.property_unit_booking_agreement_events
from public, anon, authenticated;

grant select, insert, update on
  public.property_unit_booking_agreement_readiness
to service_role;

grant select, insert, update on
  public.property_unit_booking_agreement_party_inputs
to service_role;

grant select, insert on
  public.property_unit_booking_agreement_events
to service_role;

comment on table
  public.property_unit_booking_agreement_readiness is
  'Private readiness-only property agreement workspace. It snapshots declared transaction particulars but cannot execute an agreement, prove payment, mark inventory sold or transfer ownership.';

comment on table
  public.property_unit_booking_agreement_party_inputs is
  'Private buyer and owner particulars for agreement drafting. Full Aadhaar numbers and raw identity documents must never be stored here.';

comment on table
  public.property_unit_booking_agreement_events is
  'Append-only private audit events for agreement readiness and advisory drafting. Events do not establish payment, execution, registration, title or ownership.';

comment on column
  public.property_unit_booking_agreement_readiness.boundary_north is
  'Declared northern property boundary snapshotted from the canonical unit. It is not an independent legal determination.';

comment on column
  public.property_unit_booking_agreement_readiness.boundary_south is
  'Declared southern property boundary snapshotted from the canonical unit. It is not an independent legal determination.';

comment on column
  public.property_unit_booking_agreement_readiness.boundary_east is
  'Declared eastern property boundary snapshotted from the canonical unit. It is not an independent legal determination.';

comment on column
  public.property_unit_booking_agreement_readiness.boundary_west is
  'Declared western property boundary snapshotted from the canonical unit. It is not an independent legal determination.';

create table if not exists public.vendor_conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  opportunity_id uuid null,
  module text null,
  category text null,
  user_id uuid null,
  business_profile_id uuid null,
  listing_id uuid null,
  geo_state_id uuid null,
  geo_district_id uuid null,
  geo_subdivision_id uuid null,
  geo_block_id uuid null,
  geo_place_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vendor_conversion_events
  add constraint vendor_conversion_events_event_type_check
  check (
    event_type in (
      'opportunity_viewed',
      'opportunity_clicked',
      'registration_started',
      'registration_completed',
      'vendor_approved',
      'first_listing_created'
    )
  );

create index if not exists vendor_conversion_events_event_type_idx
  on public.vendor_conversion_events(event_type);

create index if not exists vendor_conversion_events_opportunity_idx
  on public.vendor_conversion_events(opportunity_id);

create index if not exists vendor_conversion_events_created_at_idx
  on public.vendor_conversion_events(created_at desc);

create index if not exists vendor_conversion_events_module_idx
  on public.vendor_conversion_events(module);

create index if not exists vendor_conversion_events_geo_place_idx
  on public.vendor_conversion_events(geo_place_id);

alter table public.vendor_conversion_events enable row level security;

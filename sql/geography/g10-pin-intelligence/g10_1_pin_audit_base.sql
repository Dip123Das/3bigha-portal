-- =========================================================
-- G10.1 NATIONAL PIN INTELLIGENCE – AUDIT BASE
-- Purpose:
-- 1. Create auditable PIN candidate table
-- 2. Create manual override table
-- 3. Preserve existing PINs
-- 4. Never overwrite manually verified PINs
-- =========================================================

create table if not exists public.geo_pin_manual_overrides (
  id bigserial primary key,
  geo_place_id bigint not null,
  manual_pincode text not null,
  reason text,
  source_note text,
  verified_by text,
  verified_at timestamptz default now(),
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_geo_pin_manual_overrides_place
on public.geo_pin_manual_overrides (geo_place_id);

create table if not exists public.geo_pin_match_candidates (
  id bigserial primary key,
  geo_place_id bigint not null,
  lgd_state_code text,
  lgd_district_code text,
  state_name text,
  district_name text,
  place_name text,
  settlement_type text,
  candidate_pincode text not null,
  candidate_source text not null,
  confidence_score numeric(5,2) not null default 0,
  confidence_reason text,
  is_selected boolean default false,
  is_rejected boolean default false,
  rejection_reason text,
  created_at timestamptz default now()
);

create index if not exists idx_geo_pin_match_candidates_place
on public.geo_pin_match_candidates (geo_place_id);

create index if not exists idx_geo_pin_match_candidates_district
on public.geo_pin_match_candidates (lgd_district_code);

create index if not exists idx_geo_pin_match_candidates_score
on public.geo_pin_match_candidates (confidence_score desc);

create table if not exists public.geo_pin_assignment_log (
  id bigserial primary key,
  geo_place_id bigint not null,
  old_pincode text,
  new_pincode text not null,
  assignment_source text not null,
  confidence_score numeric(5,2),
  assignment_reason text,
  assigned_at timestamptz default now()
);

create index if not exists idx_geo_pin_assignment_log_place
on public.geo_pin_assignment_log (geo_place_id);

alter table public.profiles
  add column if not exists lgd_state_code integer references public.geo_lgd_states(lgd_state_code),
  add column if not exists lgd_district_code integer references public.geo_lgd_districts(lgd_district_code),
  add column if not exists lgd_subdistrict_code integer references public.geo_lgd_subdistricts(lgd_subdistrict_code),
  add column if not exists lgd_block_code integer references public.geo_lgd_blocks(lgd_block_code),
  add column if not exists lgd_village_code integer references public.geo_lgd_villages(lgd_village_code),
  add column if not exists lgd_local_body_code integer references public.geo_lgd_local_bodies(lgd_local_body_code),
  add column if not exists lgd_ward_code integer references public.geo_lgd_wards(lgd_ward_code);

create index if not exists profiles_lgd_state_code_idx
  on public.profiles(lgd_state_code);
create index if not exists profiles_lgd_district_code_idx
  on public.profiles(lgd_district_code);
create index if not exists profiles_lgd_subdistrict_code_idx
  on public.profiles(lgd_subdistrict_code);
create index if not exists profiles_lgd_block_code_idx
  on public.profiles(lgd_block_code);
create index if not exists profiles_lgd_village_code_idx
  on public.profiles(lgd_village_code);
create index if not exists profiles_lgd_local_body_code_idx
  on public.profiles(lgd_local_body_code);
create index if not exists profiles_lgd_ward_code_idx
  on public.profiles(lgd_ward_code);

-- ONB-GEO-01: Preserve official LGD identity and structured business addresses.
-- Additive only. Existing text address fields and canonical UUID fields remain intact.

alter table public.business_profiles
  add column if not exists lgd_state_code integer,
  add column if not exists lgd_district_code integer,
  add column if not exists lgd_subdistrict_code integer,
  add column if not exists lgd_block_code integer,
  add column if not exists lgd_village_code integer,
  add column if not exists lgd_local_body_code integer,
  add column if not exists lgd_ward_code integer,
  add column if not exists geo_selection_mode text,
  add column if not exists premises_type text,
  add column if not exists house_plot_flat_no text,
  add column if not exists building_market_name text,
  add column if not exists street_road_locality text;

do $migration$
begin
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_state_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_state_code_fkey foreign key (lgd_state_code) references public.geo_lgd_states(lgd_state_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_district_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_district_code_fkey foreign key (lgd_district_code) references public.geo_lgd_districts(lgd_district_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_subdistrict_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_subdistrict_code_fkey foreign key (lgd_subdistrict_code) references public.geo_lgd_subdistricts(lgd_subdistrict_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_block_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_block_code_fkey foreign key (lgd_block_code) references public.geo_lgd_blocks(lgd_block_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_village_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_village_code_fkey foreign key (lgd_village_code) references public.geo_lgd_villages(lgd_village_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_local_body_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_local_body_code_fkey foreign key (lgd_local_body_code) references public.geo_lgd_local_bodies(lgd_local_body_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_lgd_ward_code_fkey') then
    alter table public.business_profiles add constraint business_profiles_lgd_ward_code_fkey foreign key (lgd_ward_code) references public.geo_lgd_wards(lgd_ward_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'business_profiles_geo_selection_mode_check') then
    alter table public.business_profiles add constraint business_profiles_geo_selection_mode_check check (geo_selection_mode is null or geo_selection_mode in ('rural', 'urban'));
  end if;
end
$migration$;

comment on column public.business_profiles.geo_selection_mode is 'Explicit rural or urban address branch selected by the member.';
comment on column public.business_profiles.lgd_local_body_code is 'Official LGD urban local-body identifier; never treated as geo_block_id.';
comment on column public.business_profiles.lgd_ward_code is 'Official LGD ward identifier; never treated as geo_place_id without a verified ward bridge.';

-- Enforce hierarchy integrity even for direct authenticated table updates.
create or replace function public.validate_business_profile_geography()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
begin
  if new.geo_selection_mode = 'rural' and (new.lgd_local_body_code is not null or new.lgd_ward_code is not null) then
    raise exception using errcode = '23514', message = 'Rural geography cannot contain urban local-body or ward identifiers.';
  end if;
  if new.geo_selection_mode = 'urban' and (new.lgd_block_code is not null or new.lgd_village_code is not null) then
    raise exception using errcode = '23514', message = 'Urban geography cannot contain rural block or village identifiers.';
  end if;
  if new.lgd_state_code is not null and new.lgd_district_code is not null and not exists (
    select 1 from public.geo_lgd_districts d where d.lgd_district_code = new.lgd_district_code and d.lgd_state_code = new.lgd_state_code
  ) then raise exception using errcode = '23514', message = 'LGD district does not belong to the selected state.'; end if;
  if new.lgd_district_code is not null and new.lgd_subdistrict_code is not null and not exists (
    select 1 from public.geo_lgd_subdistricts s where s.lgd_subdistrict_code = new.lgd_subdistrict_code and s.lgd_district_code = new.lgd_district_code
  ) then raise exception using errcode = '23514', message = 'LGD subdistrict does not belong to the selected district.'; end if;
  if new.lgd_district_code is not null and new.lgd_block_code is not null and not exists (
    select 1 from public.geo_lgd_blocks b where b.lgd_block_code = new.lgd_block_code and b.lgd_district_code = new.lgd_district_code
  ) then raise exception using errcode = '23514', message = 'LGD block does not belong to the selected district.'; end if;
  if new.lgd_village_code is not null and not exists (
    select 1 from public.geo_lgd_villages v where v.lgd_village_code = new.lgd_village_code
      and (new.lgd_district_code is null or v.lgd_district_code = new.lgd_district_code)
      and (new.lgd_subdistrict_code is null or v.lgd_subdistrict_code = new.lgd_subdistrict_code)
  ) then raise exception using errcode = '23514', message = 'LGD village does not belong to the selected district or subdistrict.'; end if;
  if new.lgd_village_code is not null and new.lgd_block_code is not null and not exists (
    select 1 from public.geo_lgd_block_villages bv where bv.lgd_village_code = new.lgd_village_code and bv.lgd_block_code = new.lgd_block_code
  ) then raise exception using errcode = '23514', message = 'LGD village does not belong to the selected block.'; end if;
  if new.lgd_local_body_code is not null and new.lgd_district_code is not null and not exists (
    select 1 from public.geo_lgd_local_body_districts ld where ld.lgd_local_body_code = new.lgd_local_body_code and ld.lgd_district_code = new.lgd_district_code
  ) then raise exception using errcode = '23514', message = 'LGD local body does not belong to the selected district.'; end if;
  if new.lgd_ward_code is not null and not exists (
    select 1 from public.geo_lgd_wards w where w.lgd_ward_code = new.lgd_ward_code
      and (new.lgd_local_body_code is null or w.lgd_local_body_code = new.lgd_local_body_code)
  ) then raise exception using errcode = '23514', message = 'LGD ward does not belong to the selected local body.'; end if;
  if new.geo_state_id is not null and new.geo_district_id is not null and not exists (
    select 1 from public.geo_districts d where d.id = new.geo_district_id and d.state_id = new.geo_state_id
  ) then raise exception using errcode = '23514', message = 'Canonical district does not belong to the selected state.'; end if;
  if new.geo_district_id is not null and new.geo_subdivision_id is not null and not exists (
    select 1 from public.geo_subdivisions s where s.id = new.geo_subdivision_id and s.district_id = new.geo_district_id
  ) then raise exception using errcode = '23514', message = 'Canonical subdivision does not belong to the selected district.'; end if;
  if new.geo_block_id is not null and not exists (
    select 1 from public.geo_blocks b where b.id = new.geo_block_id
      and (new.geo_district_id is null or b.district_id = new.geo_district_id)
      and (new.geo_subdivision_id is null or b.subdivision_id is null or b.subdivision_id = new.geo_subdivision_id)
  ) then raise exception using errcode = '23514', message = 'Canonical block does not belong to the selected hierarchy.'; end if;
  if new.geo_place_id is not null and not exists (
    select 1 from public.geo_places p where p.id = new.geo_place_id
      and (new.geo_district_id is null or p.district_id = new.geo_district_id)
      and (new.geo_subdivision_id is null or p.subdivision_id is null or p.subdivision_id = new.geo_subdivision_id)
      and (new.geo_block_id is null or p.block_id is null or p.block_id = new.geo_block_id)
  ) then raise exception using errcode = '23514', message = 'Canonical place does not belong to the selected hierarchy.'; end if;
  return new;
end
$function$;

drop trigger if exists validate_business_profile_geography_trigger on public.business_profiles;
create trigger validate_business_profile_geography_trigger
before insert or update of lgd_state_code, lgd_district_code, lgd_subdistrict_code, lgd_block_code,
  lgd_village_code, lgd_local_body_code, lgd_ward_code, geo_selection_mode, geo_state_id,
  geo_district_id, geo_subdivision_id, geo_block_id, geo_place_id
on public.business_profiles for each row execute function public.validate_business_profile_geography();

create index if not exists business_profiles_lgd_state_code_idx on public.business_profiles(lgd_state_code);
create index if not exists business_profiles_lgd_district_code_idx on public.business_profiles(lgd_district_code);
create index if not exists business_profiles_lgd_subdistrict_code_idx on public.business_profiles(lgd_subdistrict_code);
create index if not exists business_profiles_lgd_block_code_idx on public.business_profiles(lgd_block_code);
create index if not exists business_profiles_lgd_village_code_idx on public.business_profiles(lgd_village_code);
create index if not exists business_profiles_lgd_local_body_code_idx on public.business_profiles(lgd_local_body_code);
create index if not exists business_profiles_lgd_ward_code_idx on public.business_profiles(lgd_ward_code);

comment on function public.validate_business_profile_geography() is
  'Rejects incoherent official LGD and canonical UUID geography hierarchies for business profiles.';

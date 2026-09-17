begin;

create table if not exists public.property_project_layouts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.builder_projects(id) on delete cascade,
  version integer not null,
  name text not null default 'Main project layout',
  status text not null default 'draft',
  canvas_width integer not null default 1200,
  canvas_height integer not null default 800,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_project_layouts_version_check check (version > 0),
  constraint property_project_layouts_status_check check (status in ('draft','published','archived')),
  constraint property_project_layouts_canvas_check check (canvas_width between 320 and 4000 and canvas_height between 240 and 4000),
  constraint property_project_layouts_project_version_key unique (project_id, version)
);

create unique index if not exists property_project_layouts_one_published_idx
  on public.property_project_layouts(project_id) where status = 'published';

create table if not exists public.property_project_layout_units (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.property_project_layouts(id) on delete cascade,
  unit_id uuid not null references public.builder_inventory_units(id) on delete cascade,
  position_x numeric(7,4) not null,
  position_y numeric(7,4) not null,
  width numeric(7,4) not null default 12,
  height numeric(7,4) not null default 10,
  rotation numeric(7,2) not null default 0,
  label_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_project_layout_units_layout_unit_key unique (layout_id, unit_id),
  constraint property_project_layout_units_position_check check (position_x between 0 and 100 and position_y between 0 and 100),
  constraint property_project_layout_units_size_check check (width between 2 and 100 and height between 2 and 100),
  constraint property_project_layout_units_rotation_check check (rotation between -180 and 180)
);

create index if not exists property_project_layout_units_unit_idx
  on public.property_project_layout_units(unit_id);

alter table public.property_project_layouts enable row level security;
alter table public.property_project_layout_units enable row level security;
revoke all on public.property_project_layouts from public, anon, authenticated;
revoke all on public.property_project_layout_units from public, anon, authenticated;
grant all on public.property_project_layouts to service_role;
grant all on public.property_project_layout_units to service_role;

create or replace function public.save_property_project_layout_authoritative(
  target_owner_user_id uuid,
  target_project_id uuid,
  target_layout_id uuid,
  target_name text,
  target_canvas_width integer,
  target_canvas_height integer,
  target_placements jsonb
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  saved_layout public.property_project_layouts;
  placement jsonb;
  requested_unit_ids uuid[];
  next_version integer;
begin
  if target_owner_user_id is null or target_project_id is null then
    raise exception 'Owner and project are required.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.builder_projects p join public.builder_profiles b on b.id=p.builder_profile_id
    where p.id=target_project_id and b.owner_user_id=target_owner_user_id
  ) then raise exception 'Project not found or owner is invalid.' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(target_placements,'[]'::jsonb)) <> 'array' then
    raise exception 'Placements must be an array.' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct (value->>'unitId')::uuid),'{}'::uuid[])
    into requested_unit_ids from jsonb_array_elements(coalesce(target_placements,'[]'::jsonb));
  if exists (select 1 from unnest(requested_unit_ids) as requested(unit_id) where not exists (
    select 1 from public.builder_inventory_units i where i.id=requested.unit_id and i.project_id=target_project_id
  )) then raise exception 'Every positioned unit must belong to this project.' using errcode = '22023'; end if;

  if target_layout_id is null then
    perform pg_advisory_xact_lock(hashtextextended(target_project_id::text, 0));
    select coalesce(max(version),0)+1 into next_version from public.property_project_layouts where project_id=target_project_id;
    insert into public.property_project_layouts(project_id,version,name,status,canvas_width,canvas_height,created_by)
      values(target_project_id,next_version,coalesce(nullif(btrim(target_name),''),'Main project layout'),'draft',target_canvas_width,target_canvas_height,target_owner_user_id)
      returning * into saved_layout;
  else
    select * into saved_layout from public.property_project_layouts
      where id=target_layout_id and project_id=target_project_id for update;
    if saved_layout.id is null or saved_layout.status <> 'draft' then
      raise exception 'Only an owned draft layout can be edited.' using errcode = '22023';
    end if;
    update public.property_project_layouts set
      name=coalesce(nullif(btrim(target_name),''),name), canvas_width=target_canvas_width,
      canvas_height=target_canvas_height, updated_at=now()
      where id=saved_layout.id returning * into saved_layout;
  end if;

  delete from public.property_project_layout_units where layout_id=saved_layout.id;
  for placement in select value from jsonb_array_elements(coalesce(target_placements,'[]'::jsonb)) loop
    insert into public.property_project_layout_units(layout_id,unit_id,position_x,position_y,width,height,rotation,label_override)
    values(saved_layout.id,(placement->>'unitId')::uuid,(placement->>'x')::numeric,(placement->>'y')::numeric,
      coalesce(nullif(placement->>'width','')::numeric,12),coalesce(nullif(placement->>'height','')::numeric,10),
      coalesce(nullif(placement->>'rotation','')::numeric,0),nullif(btrim(placement->>'label'),''));
  end loop;
  return jsonb_build_object('layoutId',saved_layout.id,'version',saved_layout.version,'status',saved_layout.status);
end;
$$;

create or replace function public.publish_property_project_layout_authoritative(
  target_owner_user_id uuid, target_project_id uuid, target_layout_id uuid
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare selected_layout public.property_project_layouts;
begin
  if not exists (
    select 1 from public.builder_projects p join public.builder_profiles b on b.id=p.builder_profile_id
    where p.id=target_project_id and b.owner_user_id=target_owner_user_id
  ) then raise exception 'Project not found or owner is invalid.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_project_id::text, 0));
  select * into selected_layout from public.property_project_layouts
    where id=target_layout_id and project_id=target_project_id for update;
  if selected_layout.id is null or selected_layout.status <> 'draft' then
    raise exception 'Only a draft layout can be published.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.property_project_layout_units where layout_id=target_layout_id) then
    raise exception 'Position at least one unit before publishing.' using errcode = '22023';
  end if;
  update public.property_project_layouts set status='archived',updated_at=now()
    where project_id=target_project_id and status='published';
  update public.property_project_layouts set status='published',published_at=now(),updated_at=now()
    where id=target_layout_id;
  return jsonb_build_object('layoutId',target_layout_id,'version',selected_layout.version,'status','published');
end;
$$;

revoke all on function public.save_property_project_layout_authoritative(uuid,uuid,uuid,text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_property_project_layout_authoritative(uuid,uuid,uuid,text,integer,integer,jsonb) to service_role;
revoke all on function public.publish_property_project_layout_authoritative(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.publish_property_project_layout_authoritative(uuid,uuid,uuid) to service_role;

commit;

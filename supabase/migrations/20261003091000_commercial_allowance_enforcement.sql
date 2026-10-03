begin;
-- Transition allowance protects existing work for 30 days; new purchases remain separate from revenue.
create table public.commercial_transition_allowances(user_id uuid primary key references auth.users(id),property_slots integer not null default 0,ends_at timestamptz not null);
alter table public.commercial_transition_allowances enable row level security;
revoke all on public.commercial_transition_allowances from anon,authenticated;
grant all on public.commercial_transition_allowances to service_role;
create function public.commercial_property_usage(p_user uuid) returns integer language sql volatile security definer set search_path=public,pg_catalog as $$
 select count(distinct item)::integer from (
  select 'unit:'||u.id::text item from public.builder_inventory_units u join public.builder_projects p on p.id=u.project_id join public.builder_profiles b on b.id=p.builder_profile_id
  where b.owner_user_id=p_user and p.is_active and p.status='active' and u.status::text in('available','reserved') and u.trust_status='verified'
  union all
  select coalesce('unit:'||s.unit_id::text,'listing:'||l.id::text) from public.property_listings l left join public.property_listing_sources s on s.property_id=l.id and s.source_kind='builder_inventory'
  where l.owner_id=p_user and l.status::text in('approved','active','published','pending')
  and not exists(select 1 from public.builder_inventory_units u where u.id=s.unit_id and u.status::text in('sold','booked','blocked'))
 ) q;
$$;
insert into public.commercial_transition_allowances select owner,public.commercial_property_usage(owner),now()+interval '30 days' from (select distinct owner_id owner from public.property_listings where owner_id is not null union select owner_user_id from public.builder_profiles where owner_user_id is not null) owners;
insert into public.commercial_entitlements(user_id,product,kind,resource_id,allowance,starts_at,ends_at,source)
 select user_id,'construction','construction',id,1,now(),now()+interval '30 days','transition_access' from public.bos_cost_plans where operating_mode='project' and status not in('completed','archived','draft');
insert into public.commercial_entitlements(user_id,product,kind,allowance,starts_at,ends_at,source)
 select user_id,'manufacturing','manufacturing',greatest(count(*)::integer,5),now(),now()+interval '30 days','transition_access' from public.bos_cost_plans where operating_mode='product' and status not in('completed','archived','draft') group by user_id;

create function public.commercial_property_limit(p_user uuid) returns integer language sql stable security definer set search_path=public,pg_catalog as $$
 select greatest(
  case when public.commercial_has_access(p_user,'base') then 1+coalesce((select max(allowance) from public.commercial_entitlements where user_id=p_user and kind='property_pack' and revoked_at is null and starts_at<=now() and (ends_at is null or ends_at>now())),0) else 0 end,
  coalesce((select property_slots from public.commercial_transition_allowances where user_id=p_user and ends_at>now()),0));
$$;
-- Lock before mutation, then count after mutation. The same per-account lock serializes purchases and all publications.
create function public.guard_commercial_property() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare j jsonb; old_j jsonb; owner uuid; previous_owner uuid; project uuid; positive_change boolean:=true;
begin
 if not (select enforcement_enabled from public.commercial_controls where id=true) then return coalesce(new,old); end if;
 j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end; old_j:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 if tg_table_name='property_listings' then
  owner:=(j->>'owner_id')::uuid;
  if tg_op='UPDATE' and (old_j->>'owner_id') is distinct from (j->>'owner_id') then raise exception 'Property owner cannot change through publication.'; end if;
  positive_change:=(j->>'status') in('approved','active','published','pending') and (tg_op='INSERT' or coalesce(old_j->>'status','') not in('approved','active','published','pending'));
 elsif tg_table_name='builder_projects' then
  select owner_user_id into owner from public.builder_profiles where id=(j->>'builder_profile_id')::uuid;
  if tg_op='UPDATE' and old_j->>'builder_profile_id' is distinct from j->>'builder_profile_id' then raise exception 'Project owner cannot change through publication.'; end if;
  positive_change:=(j->>'is_active')::boolean and j->>'status'='active' and (tg_op='INSERT' or coalesce((old_j->>'is_active')::boolean,false)=false or old_j->>'status'<>'active');
 elsif tg_table_name='builder_inventory_units' then
  project:=(j->>'project_id')::uuid;
  if tg_op='UPDATE' and old_j->>'project_id' is distinct from j->>'project_id' then raise exception 'A unit cannot move to a different project.'; end if;
  select b.owner_user_id into owner from public.builder_projects p join public.builder_profiles b on b.id=p.builder_profile_id where p.id=project;
  positive_change:=j->>'status' in('available','reserved') and j->>'trust_status'='verified' and (tg_op='INSERT' or coalesce(old_j->>'status','') not in('available','reserved') or old_j->>'trust_status' is distinct from 'verified');
 else
  select owner_id into owner from public.property_listings where id=(j->>'property_id')::uuid;
  if tg_op='UPDATE' then
   select owner_id into previous_owner from public.property_listings where id=(old_j->>'property_id')::uuid;
   if previous_owner is distinct from owner then raise exception 'Listing source owner cannot change.'; end if;
  end if;
  if tg_op<>'DELETE' and j->>'source_kind'='builder_inventory' and not exists(select 1 from public.builder_inventory_units u join public.builder_projects p on p.id=u.project_id join public.builder_profiles b on b.id=p.builder_profile_id where u.id=(j->>'unit_id')::uuid and b.owner_user_id=owner) then raise exception 'A listing can only link to the same owner’s unit.'; end if;
  -- Relinking can split one marketed unit into two capacity items.
  positive_change:=true;
 end if;
 if owner is null then raise exception 'Property ownership required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,91003));
 if tg_when='AFTER' and positive_change and public.commercial_property_usage(owner)>public.commercial_property_limit(owner) then
  raise exception 'Active property capacity reached. Review your listings or buy an optional property pack at /dashboard/subscription.';
 end if;
 return coalesce(new,old);
end $$;
do $$ declare t text; begin
 foreach t in array array['property_listings','builder_projects','builder_inventory_units','property_listing_sources'] loop
  execute format('create trigger commercial_property_lock before insert or update on public.%I for each row execute function public.guard_commercial_property()',t);
  execute format('create trigger commercial_property_capacity after insert or update on public.%I for each row execute function public.guard_commercial_property()',t);
 end loop;
 create trigger commercial_property_source_delete_lock before delete on public.property_listing_sources for each row execute function public.guard_commercial_property();
 create trigger commercial_property_source_delete_capacity after delete on public.property_listing_sources for each row execute function public.guard_commercial_property();
end $$;

create function public.guard_commercial_cost() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare j jsonb; old_j jsonb; p public.bos_cost_plans%rowtype; n integer; quota integer;
begin
 if not(select enforcement_enabled from public.commercial_controls where id=true) then return coalesce(new,old); end if;
 j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 old_j:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 if tg_table_name='bos_cost_plans' then
  p:=case when tg_op='DELETE' then old else new end;
  if tg_op='UPDATE' and (old.user_id,old.operating_mode,old.source_entity_id) is distinct from (new.user_id,new.operating_mode,new.source_entity_id) then raise exception 'Cost register ownership, mode and project link are fixed.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p.user_id::text,91003));
  if tg_op='INSERT' and p.status='draft' then return new; end if;
  if tg_op='UPDATE' and new.status in('completed','archived') and (to_jsonb(new)-'status'-'updated_at')=(to_jsonb(old)-'status'-'updated_at') then return new; end if;
  if tg_op='DELETE' and p.status='draft' then return old; end if;
 else
  if j ? 'plan_id' then select * into p from public.bos_cost_plans where id=(j->>'plan_id')::uuid;
  elsif j ? 'entry_id' then select cp.* into p from public.bos_cost_plans cp join public.bos_cost_entries e on e.plan_id=cp.id where e.id=(j->>'entry_id')::uuid;
  end if;
  if p.id is null then raise exception 'A paid cost register is required for this write.'; end if;
  if tg_op='UPDATE' and ((j->>'plan_id') is distinct from (old_j->>'plan_id') or (j->>'entry_id') is distinct from (old_j->>'entry_id')) then raise exception 'Cost entries cannot move between registers.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p.user_id::text,91003));
  if p.status='draft' then raise exception 'Activate this register after purchasing costing access.'; end if;
  if p.status in('completed','archived') then raise exception 'Completed records are read-only. Reopen an entitled register before editing.'; end if;
 end if;
 if not public.commercial_operating_capability(p.user_id,case when p.operating_mode='project' then 'project_costing' else 'product_costing' end) then raise exception 'Your identity does not have this costing capability.'; end if;
 if not public.commercial_account_ready(p.user_id) then raise exception 'Your business account must be approved for cost management.'; end if;
 if p.operating_mode='project' then
  if not public.commercial_has_access(p.user_id,'construction',p.id) then raise exception 'Activate construction or turnkey-project costing at /dashboard/subscription. Existing records remain readable.'; end if;
 else
  if not public.commercial_has_access(p.user_id,'manufacturing') then raise exception 'Activate manufacturing costing at /dashboard/subscription. Inventory and existing records remain available.'; end if;
  select max(allowance) into quota from public.commercial_entitlements where user_id=p.user_id and kind='manufacturing' and revoked_at is null and starts_at<=now() and (ends_at is null or ends_at>now());
  select count(*) into n from public.bos_cost_plans where user_id=p.user_id and operating_mode='product' and status not in('completed','archived','draft') and id<>p.id;
  if p.status not in('completed','archived','draft') and n>=quota then raise exception 'Manufacturing allowance reached. Complete or archive a register to free a slot.'; end if;
 end if;
 return coalesce(new,old);
end $$;
create trigger commercial_cost_plan_write before insert or update or delete on public.bos_cost_plans for each row execute function public.guard_commercial_cost();
do $$ declare t text; begin
 foreach t in array array['bos_cost_centres','bos_cost_plan_sections','bos_cost_plan_lines','bos_cost_entries','bos_cost_outputs','bos_cost_plan_revisions','bos_cost_inventory_handoffs','bos_cost_procurement_handoffs','bos_cost_stock_consumption_intents','bos_cost_entry_custom_values'] loop
  if to_regclass('public.'||t) is not null then execute format('create trigger commercial_cost_write before insert or update or delete on public.%I for each row execute function public.guard_commercial_cost()',t); end if;
 end loop;
end $$;
revoke all on function public.commercial_property_usage(uuid),public.commercial_property_limit(uuid),public.guard_commercial_property(),public.guard_commercial_cost() from public,anon,authenticated;
grant execute on function public.commercial_property_usage(uuid),public.commercial_property_limit(uuid) to service_role;
commit;

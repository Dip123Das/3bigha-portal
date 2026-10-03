begin;
create function public.link_commercial_project_register(p_user uuid,p_project uuid,p_type text) returns uuid language plpgsql security definer set search_path=public,pg_catalog as $$
declare register_id uuid; project_title text;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Trusted project linkage required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,91003));
 if not public.commercial_operating_capability(p_user,'project_costing') then raise exception 'Project costing is not enabled for your business identity.'; end if;
 if p_type='construction_project' then select title into project_title from public.construction_projects where id=p_project and user_id=p_user and status not in('completed','cancelled');
 elsif p_type='builder_project' then select p.name into project_title from public.builder_projects p join public.builder_profiles b on b.id=p.builder_profile_id where p.id=p_project and b.owner_user_id=p_user;
 else raise exception 'Select a valid project type.'; end if;
 if project_title is null then raise exception 'Your ongoing project was not found.'; end if;
 select id into register_id from public.bos_cost_plans where user_id=p_user and operating_mode='project' and source_entity_type=p_type and source_entity_id=p_project order by created_at limit 1;
 if register_id is null then
  insert into public.bos_cost_plans(user_id,operating_mode,title,status,source_system,source_entity_type,source_entity_id)
  values(p_user,'project',project_title,'draft','commercial_project_link',p_type,p_project) returning id into register_id;
 end if;
 return register_id;
end $$;
create function public.guard_commercial_project_link() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
 if tg_op='UPDATE' and (new.source_entity_id,new.source_entity_type) is distinct from (old.source_entity_id,old.source_entity_type) then raise exception 'The project link of a cost register is fixed.'; end if;
 if new.operating_mode='project' and new.source_entity_id is not null and new.source_entity_type in('construction_project','builder_project') then
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,91003));
  if new.source_entity_type='construction_project' and not exists(select 1 from public.construction_projects where id=new.source_entity_id and user_id=new.user_id) then raise exception 'Construction project ownership required.'; end if;
  if new.source_entity_type='builder_project' and not exists(select 1 from public.builder_projects p join public.builder_profiles b on b.id=p.builder_profile_id where p.id=new.source_entity_id and b.owner_user_id=new.user_id) then raise exception 'Builder project ownership required.'; end if;
  if exists(select 1 from public.bos_cost_plans where user_id=new.user_id and source_entity_type=new.source_entity_type and source_entity_id=new.source_entity_id and id<>new.id) then raise exception 'This project already has a cost register. Use its existing subscription.'; end if;
 end if;
 return new;
end $$;
create trigger commercial_project_link before insert or update on public.bos_cost_plans for each row execute function public.guard_commercial_project_link();
create function public.guard_commercial_construction_execution() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
declare project_id uuid; owner uuid; register_id uuid; j jsonb; ongoing boolean;
begin
 if not(select enforcement_enabled from public.commercial_controls where id=true) then return coalesce(new,old); end if;
 j:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 if tg_table_name='construction_projects' then
  project_id:=(j->>'id')::uuid;owner:=(j->>'user_id')::uuid;
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then raise exception 'Construction project ownership is fixed.'; end if;
  ongoing:=j->>'status' in('procurement','execution');
 else
  project_id:=(j->>'project_id')::uuid;
  select user_id into owner from public.construction_projects where id=project_id;
  if tg_op='UPDATE' and new.project_id is distinct from old.project_id then raise exception 'Milestone project link is fixed.'; end if;
  ongoing:=coalesce((j->>'progress_percent')::integer,0)>0 or j->>'actual_start_date' is not null or j->>'actual_end_date' is not null or coalesce(j->>'status','pending')<>'pending';
 end if;
 if not ongoing then return coalesce(new,old); end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text,91003));
 select id into register_id from public.bos_cost_plans where user_id=owner and source_entity_type='construction_project' and source_entity_id=project_id order by created_at limit 1;
 if register_id is null or not public.commercial_has_access(owner,'construction',register_id) or not public.commercial_operating_capability(owner,'project_costing') then raise exception 'Activate this project costing subscription at /dashboard/subscription before recording ongoing execution.'; end if;
 return coalesce(new,old);
end $$;
create trigger commercial_construction_execution before insert or update or delete on public.construction_projects for each row execute function public.guard_commercial_construction_execution();
create trigger commercial_construction_milestone before insert or update or delete on public.construction_project_milestones for each row execute function public.guard_commercial_construction_execution();
-- Completion/cancellation stops new project purchases; manual renewal cannot run automatically.
create function public.close_linked_commercial_register() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
 if new.status in('completed','cancelled') and new.status is distinct from old.status then
  update public.bos_cost_plans set status=case when new.status='completed' then 'completed' else 'archived' end
  where user_id=new.user_id and source_entity_type='construction_project' and source_entity_id=new.id;
 end if;
 return new;
end $$;
create trigger close_linked_commercial_register after update on public.construction_projects for each row execute function public.close_linked_commercial_register();
revoke all on function public.link_commercial_project_register(uuid,uuid,text),public.guard_commercial_project_link(),public.guard_commercial_construction_execution(),public.close_linked_commercial_register() from public,anon,authenticated;
grant execute on function public.link_commercial_project_register(uuid,uuid,text) to service_role;
commit;

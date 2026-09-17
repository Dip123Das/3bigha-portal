begin transaction read only;
with checks as (
  select 'relation:'||c.relname check_name,case when c.relrowsecurity then 'PASS' else 'FAIL' end status,'rls='||c.relrowsecurity detail
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in ('property_project_layouts','property_project_layout_units')
  union all
  select 'function:'||p.proname,case when p.prosecdef and not has_function_privilege('authenticated',p.oid,'EXECUTE') then 'PASS' else 'FAIL' end,
    'security_definer='||p.prosecdef
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('save_property_project_layout_authoritative','publish_property_project_layout_authoritative')
  union all select 'legacy:unit_count_preserved','INFO',count(*)::text from public.builder_inventory_units
  union all select 'layouts:current_count','INFO',count(*)::text from public.property_project_layouts
)
select * from checks order by case status when 'FAIL' then 1 when 'PASS' then 2 else 3 end,check_name;
rollback;

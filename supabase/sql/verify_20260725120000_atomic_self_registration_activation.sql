begin;

do $verification$
declare
  v_verifier_definition text;
  v_activation_definition text;
  v_guard_exists boolean;
begin
  select pg_get_functiondef(p.oid)
    into v_verifier_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'evaluate_automated_registration_verification'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1;

  if v_verifier_definition is null then
    raise exception 'Automated registration verifier is missing.';
  end if;

  if v_verifier_definition ilike '%or not v_registration_complete%'
     or v_verifier_definition ilike '%and v_registration_complete%' then
    raise exception 'Circular registration_complete prerequisite still exists.';
  end if;

  if v_verifier_definition not ilike '%v_next_status := ''auto_verified''%' then
    raise exception 'Automatic verification success path is missing.';
  end if;

  select pg_get_functiondef(p.oid)
    into v_activation_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'activate_self_registered_dashboard'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1;

  if v_activation_definition is null then
    raise exception 'Atomic self-activation function is missing.';
  end if;

  if v_activation_definition not ilike '%evaluate_automated_registration_verification()%' then
    raise exception 'Activation does not use the canonical verifier.';
  end if;

  if v_activation_definition not ilike '%vendor_registration_complete(v_user_id)%' then
    raise exception 'Activation does not complete canonical registration.';
  end if;

  if v_activation_definition not ilike '%approval_status = ''approved''%' then
    raise exception 'Self-approval transition is missing.';
  end if;

  if v_activation_definition not ilike '%dashboard_activation_status = ''active''%' then
    raise exception 'Dashboard activation transition is missing.';
  end if;

  select exists (
    select 1 from pg_trigger
    where tgname = 'business_profiles_registration_completion_guard'
      and not tgisinternal
  ) into v_guard_exists;

  if not v_guard_exists then
    raise exception 'Canonical registration guard trigger is missing.';
  end if;
end
$verification$;

select
  p.proname,
  p.prosecdef as is_security_definer,
  pg_get_userbyid(p.proowner) = 'postgres' as owner_is_postgres,
  replace(array_to_string(p.proconfig, ','), ' ', '')
    like '%search_path=public,auth,pg_catalog%' as hardened_search_path,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'evaluate_automated_registration_verification',
    'activate_self_registered_dashboard'
  )
order by p.proname;

rollback;

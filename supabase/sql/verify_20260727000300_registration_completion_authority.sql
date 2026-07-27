do $verification$
declare
  v_definition text;
  v_owner text;
  v_security_definer boolean;
  v_search_path text;
  v_public_execute boolean;
  v_anon_execute boolean;
  v_authenticated_execute boolean;
  v_service_role_execute boolean;
begin
  select
    pg_get_functiondef(p.oid),
    pg_get_userbyid(p.proowner),
    p.prosecdef,
    array_to_string(p.proconfig, ',')
  into
    v_definition,
    v_owner,
    v_security_definer,
    v_search_path
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'business_registration_evidence_ready'
    and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid';

  if v_definition is null then
    raise exception
      'business_registration_evidence_ready(uuid) was not found';
  end if;

  if v_owner <> 'postgres' then
    raise exception
      'Unexpected function owner: %',
      v_owner;
  end if;

  if not v_security_definer then
    raise exception
      'Function is not SECURITY DEFINER';
  end if;

  if coalesce(v_search_path, '') not like
       '%search_path=public, auth, pg_catalog%' then
    raise exception
      'Hardened search_path is missing: %',
      v_search_path;
  end if;

  if v_definition not ilike
       '%business.business_media_json%' then
    raise exception
      'Canonical business_media_json is not used';
  end if;

  if v_definition not ilike
       '%/live-selfie/%' then
    raise exception
      'Canonical live-selfie evidence is not recognized';
  end if;

  if v_definition not ilike
       '%/practical-proof/%' then
    raise exception
      'Canonical practical-proof evidence is not recognized';
  end if;

  if v_definition not ilike
       '%business.vendor_document_verification_json%' then
    raise exception
      'Canonical document verification is not used';
  end if;

  if v_definition not ilike
       '%business.selfie_media_json%' then
    raise exception
      'Legacy selfie compatibility fallback is missing';
  end if;

  if v_definition not ilike
       '%business.workplace_media_json%' then
    raise exception
      'Legacy workplace compatibility fallback is missing';
  end if;

  if v_definition not ilike
       '%business.automated_verification_json%' then
    raise exception
      'Legacy document compatibility fallback is missing';
  end if;

  select has_function_privilege(
    'public',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  )
  into v_public_execute;

  select has_function_privilege(
    'anon',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  )
  into v_anon_execute;

  select has_function_privilege(
    'authenticated',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  )
  into v_authenticated_execute;

  select has_function_privilege(
    'service_role',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  )
  into v_service_role_execute;

  if v_public_execute then
    raise exception
      'PUBLIC must not execute the authority function';
  end if;

  if v_anon_execute then
    raise exception
      'anon must not execute the authority function';
  end if;

  if not v_authenticated_execute then
    raise exception
      'authenticated execution privilege is missing';
  end if;

  if not v_service_role_execute then
    raise exception
      'service_role execution privilege is missing';
  end if;

  raise notice
    'R3.5D production authority verification passed.';
end;
$verification$;

select
  p.proname as function_name,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as is_security_definer,
  p.proconfig as function_configuration,
  has_function_privilege(
    'public',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  ) as public_can_execute,
  has_function_privilege(
    'anon',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  ) as authenticated_can_execute,
  has_function_privilege(
    'service_role',
    'public.business_registration_evidence_ready(uuid)',
    'execute'
  ) as service_role_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname =
    'business_registration_evidence_ready'
  and pg_get_function_identity_arguments(p.oid) =
    'p_user_id uuid';

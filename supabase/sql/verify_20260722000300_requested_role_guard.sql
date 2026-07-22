-- Read-only verification for 20260722000300. This script does not invoke the
-- RPC or change database state. Every returned boolean must be true and
-- stale_guard_rows must be zero.

with function_source as (
  select pg_get_functiondef(
    'public.declare_operating_profile(text,text[],text)'::regprocedure
  ) as body
), markers as (
  select
    body,
    strpos(body, 'if v_previous_requested_role is not null') as validation_position,
    strpos(body, 'insert into private.member_role_transition_guard') as guard_position
  from function_source
)
select
  validation_position > 0 as requested_role_validation_present,
  guard_position > validation_position as validation_precedes_guard,
  body like '%v_previous_requested_role = any(v_allowed_roles)%'
    as ordinary_requested_roles_use_allowlist,
  body like '%v_allowed_roles constant text[] := array[''buyer'',''vendor'',''builder'',''hub_vendor'',''blogger'']%'
    as exact_ordinary_allowlist_present,
  body like '%if v_previous_requested_role is not null%'
    as null_requested_role_bypasses_rejection,
  body like '%A protected or unknown requested role cannot be changed through member registration%'
    as protected_requested_role_rejection_present,
  body not like '%set_config(%'
    and body not like '%current_setting(%'
    as no_custom_guc_authorisation,
  body not like '%session_replication_role%'
    and body not like '%disable trigger%'
    as triggers_remain_enforced
from markers;

select count(*) as stale_guard_rows
from private.member_role_transition_guard
where transaction_id = txid_current()
  and user_id = auth.uid();

select
  procedure.prosecdef as is_security_definer,
  pg_get_userbyid(procedure.proowner) = 'postgres' as owner_is_postgres,
  procedure.proconfig = array['search_path=public, auth, private, pg_catalog']::text[]
    as hardened_search_path_preserved,
  not exists (
    select 1
    from aclexplode(coalesce(
      procedure.proacl,
      acldefault('f', procedure.proowner)
    )) privilege
    where privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ) as public_cannot_execute,
  not has_function_privilege('anon', procedure.oid, 'EXECUTE')
    as anon_cannot_execute,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    as authenticated_can_execute
from pg_proc procedure
where procedure.oid =
  'public.declare_operating_profile(text,text[],text)'::regprocedure;

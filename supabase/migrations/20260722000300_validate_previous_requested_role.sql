-- Narrow production reconciliation for the already-live controlled member-role
-- transition function. The live function is missing only the validation of the
-- existing requested_role before its one-use private guard row is created.

create or replace function public.declare_operating_profile(
  p_operating_profile text,
  p_identity_keys text[],
  p_primary_identity_key text
) returns void
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_plan text;
  v_count integer;
  v_role_count integer;
  v_effective_role text;
  v_previous_role text;
  v_previous_requested_role text;
  v_allowed_roles constant text[] := array['buyer','vendor','builder','hub_vendor','blogger'];
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_operating_profile = 'individual_professional' then
    v_limit := 1; v_plan := 'individual_growth';
  elsif p_operating_profile = 'multi_service_professional' then
    v_limit := 5; v_plan := 'multi_service_growth';
  elsif p_operating_profile = 'multi_business_organisation' then
    v_limit := null; v_plan := 'multi_business_operating';
  else
    raise exception 'Invalid operating profile';
  end if;

  select count(distinct key) into v_count
  from unnest(coalesce(p_identity_keys, array[]::text[])) key;

  if v_count = 0 or not (p_primary_identity_key = any(p_identity_keys)) then
    raise exception 'A valid primary category is required';
  end if;
  if p_operating_profile = 'multi_service_professional' and v_count < 2 then
    raise exception 'Multi-Service Professional requires at least two categories';
  end if;
  if v_limit is not null and v_count > v_limit then
    raise exception 'CATEGORY_LIMIT_EXCEEDED: this operating profile supports % categories', v_limit;
  end if;

  if exists (
    select 1
    from unnest(p_identity_keys) key
    left join public.identity_master identity
      on identity.identity_key = key and identity.is_active
    where identity.identity_key is null
  ) then
    raise exception 'One or more categories are unavailable';
  end if;

  select count(distinct identity.legacy_role), min(identity.legacy_role)
  into v_role_count, v_effective_role
  from unnest(p_identity_keys) key
  join public.identity_master identity
    on identity.identity_key = key and identity.is_active;

  if v_role_count <> 1
     or v_effective_role is null
     or not (v_effective_role = any(v_allowed_roles)) then
    raise exception 'Selected categories must map to one permitted member role';
  end if;

  if not exists (
    select 1 from public.identity_master identity
    where identity.identity_key = p_primary_identity_key
      and identity.is_active
      and identity.legacy_role = v_effective_role
  ) then
    raise exception 'The primary category does not match the selected member role';
  end if;

  select profile.role, profile.requested_role
  into v_previous_role, v_previous_requested_role
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception 'Member profile not found';
  end if;

  if v_previous_role is not null
     and not (v_previous_role = any(v_allowed_roles)) then
    raise exception 'A protected or unknown access role cannot be changed through member registration';
  end if;

  if v_previous_requested_role is not null
     and not (v_previous_requested_role = any(v_allowed_roles)) then
    raise exception 'A protected or unknown requested role cannot be changed through member registration';
  end if;

  insert into private.member_role_transition_guard(
    transaction_id, user_id, previous_role, previous_requested_role,
    new_role, new_requested_role, new_is_vendor
  ) values (
    txid_current(), v_user_id, v_previous_role, v_previous_requested_role,
    v_effective_role, v_effective_role, v_effective_role <> 'buyer'
  );

  update public.profiles
  set role = v_effective_role,
      requested_role = v_effective_role,
      is_vendor = (v_effective_role <> 'buyer'),
      updated_at = now()
  where id = v_user_id;

  if exists (
    select 1 from private.member_role_transition_guard guard
    where guard.transaction_id = txid_current() and guard.user_id = v_user_id
  ) then
    raise exception 'Controlled role transition was not consumed by the profile protection trigger';
  end if;

  insert into public.member_operating_profiles(
    user_id, operating_profile, primary_identity_key, category_limit,
    recommended_growth_plan, updated_at
  ) values (
    v_user_id, p_operating_profile, p_primary_identity_key, v_limit, v_plan, now()
  )
  on conflict(user_id) do update set
    operating_profile = excluded.operating_profile,
    primary_identity_key = excluded.primary_identity_key,
    category_limit = excluded.category_limit,
    recommended_growth_plan = excluded.recommended_growth_plan,
    updated_at = now();

  delete from public.member_identity_entitlements
  where user_id = v_user_id and identity_key <> all(p_identity_keys);

  update public.member_identity_entitlements
  set is_primary = false, updated_at = now()
  where user_id = v_user_id;

  insert into public.member_identity_entitlements(
    user_id, identity_key, is_primary, status, source
  )
  select v_user_id, key, key = p_primary_identity_key,
    case when identity.requires_professional_verification
      then 'pending_verification' else 'active' end,
    'registration'
  from unnest(p_identity_keys) key
  join public.identity_master identity on identity.identity_key = key
  on conflict(user_id, identity_key) do update set
    is_primary = excluded.is_primary,
    status = excluded.status,
    updated_at = now();

  if v_previous_role is distinct from v_effective_role then
    insert into public.member_role_transition_audit(
      user_id, previous_role, new_role, operating_profile, primary_identity_key
    ) values (
      v_user_id, v_previous_role, v_effective_role,
      p_operating_profile, p_primary_identity_key
    );
  end if;
end;
$$;

alter function public.declare_operating_profile(text,text[],text) owner to postgres;
revoke all on function public.declare_operating_profile(text,text[],text)
  from public, anon, authenticated;
grant execute on function public.declare_operating_profile(text,text[],text)
  to authenticated;

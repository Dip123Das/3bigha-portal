-- Controlled self-service transitions between ordinary 3Bigha member roles.
-- Administrative and unknown roles remain outside this workflow.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.member_role_transition_guard (
  transaction_id bigint not null,
  user_id uuid not null,
  previous_role text,
  previous_requested_role text,
  new_role text not null,
  new_requested_role text not null,
  new_is_vendor boolean not null,
  primary key (transaction_id, user_id)
);

revoke all on table private.member_role_transition_guard
  from public, anon, authenticated;

create table if not exists public.member_role_transition_audit (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_role text,
  new_role text not null,
  operating_profile text not null,
  primary_identity_key text not null references public.identity_master(identity_key),
  changed_at timestamptz not null default now()
);

alter table public.member_role_transition_audit enable row level security;

drop policy if exists member_role_transition_audit_read_own
  on public.member_role_transition_audit;
create policy member_role_transition_audit_read_own
  on public.member_role_transition_audit
  for select using (auth.uid() = user_id);

revoke all on table public.member_role_transition_audit
  from public, anon, authenticated;
grant select on table public.member_role_transition_audit to authenticated;

-- This is the exact live function body with one narrow addition: an UPDATE may
-- carry an ordinary role transition only when the SECURITY DEFINER declaration
-- RPC has installed a matching, transaction-scoped, one-use private guard row.
create or replace function public.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  jwt_role text;
  expected_is_vendor boolean;
  authorised_role_transition boolean := false;
begin
  jwt_role := coalesce(auth.role(), '');

  -- TRUSTED DATABASE AND SERVER OPERATIONS
  -- Use session_user, not current_user. In a SECURITY DEFINER function,
  -- current_user is the function owner and is not the client identity.
  if jwt_role = 'service_role'
     or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- Requests outside ordinary browser authentication are not handled as
  -- self-service profile changes.
  if jwt_role not in ('authenticated', 'anon') then
    return new;
  end if;

  -- INSERT: preserve the complete live behaviour.
  if tg_op = 'INSERT' then
    if new.role is not null
       and new.role not in ('buyer','vendor','builder','hub_vendor','blogger') then
      raise exception 'This account role cannot be assigned through self-registration.'
        using errcode = '42501';
    end if;

    if new.requested_role is not null
       and new.requested_role not in ('buyer','vendor','builder','hub_vendor','blogger') then
      raise exception 'This requested role cannot be selected through self-registration.'
        using errcode = '42501';
    end if;

    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.approval_status := 'active';

    if new.role is null then
      new.is_vendor := false;
    else
      new.is_vendor := new.role in ('vendor','builder','hub_vendor','blogger');
    end if;

    return new;
  end if;

  -- UPDATE: consume an exact one-use guard before applying the existing rules.
  if tg_op = 'UPDATE' then
    delete from private.member_role_transition_guard guard
    where guard.transaction_id = txid_current()
      and guard.user_id = auth.uid()
      and guard.user_id = old.id
      and guard.previous_role is not distinct from old.role
      and guard.previous_requested_role is not distinct from old.requested_role
      and guard.new_role = new.role
      and guard.new_requested_role = new.requested_role
      and guard.new_is_vendor = new.is_vendor
    returning true into authorised_role_transition;

    if new.role is distinct from old.role then
      if authorised_role_transition then
        null;
      elsif old.role is null
         and new.role in ('buyer','vendor','builder','hub_vendor','blogger') then
        null;
      else
        raise exception 'Your access role cannot be changed directly.'
          using errcode = '42501';
      end if;
    end if;

    if new.requested_role is distinct from old.requested_role then
      if authorised_role_transition then
        null;
      elsif old.requested_role is null
         and new.requested_role in ('buyer','vendor','builder','hub_vendor','blogger') then
        null;
      else
        raise exception 'Your requested role cannot be changed directly.'
          using errcode = '42501';
      end if;
    end if;

    if new.approval_status is distinct from old.approval_status then
      raise exception 'Account approval status can only be changed by authorised administration.'
        using errcode = '42501';
    end if;

    if new.approved_by is distinct from old.approved_by then
      raise exception 'Account approval information can only be changed by authorised administration.'
        using errcode = '42501';
    end if;

    if new.approved_at is distinct from old.approved_at then
      raise exception 'Account approval information can only be changed by authorised administration.'
        using errcode = '42501';
    end if;

    if new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Account review information can only be changed by authorised administration.'
        using errcode = '42501';
    end if;

    if new.role in ('buyer','vendor','builder','hub_vendor','blogger') then
      expected_is_vendor := new.role in ('vendor','builder','hub_vendor','blogger');

      if new.is_vendor is distinct from old.is_vendor
         and new.is_vendor is distinct from expected_is_vendor then
        raise exception 'Business access must remain consistent with the account role.'
          using errcode = '42501';
      end if;

      if new.role is distinct from old.role then
        new.is_vendor := expected_is_vendor;
      end if;
    else
      if new.is_vendor is distinct from old.is_vendor then
        raise exception 'Business access for this account can only be changed by authorised administration.'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

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

revoke all on function public.declare_operating_profile(text,text[],text)
  from public, anon, authenticated;
grant execute on function public.declare_operating_profile(text,text[],text)
  to authenticated;

-- Self-registration records identity intent only. Operational access requires
-- an explicit Master Admin approval followed by an activated paid subscription.

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

  if jwt_role = 'service_role'
     or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if jwt_role not in ('authenticated', 'anon') then
    return new;
  end if;

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
    new.approval_status := 'pending';

    if new.role is null then
      new.is_vendor := false;
    else
      new.is_vendor := new.role in ('vendor','builder','hub_vendor','blogger');
    end if;

    return new;
  end if;

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

alter function public.protect_profile_access_fields() owner to postgres;

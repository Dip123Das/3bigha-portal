alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('active','deactivated','re_registration_required','permanently_blocked'));

alter table public.admin_account_action_audit drop constraint if exists admin_account_action_audit_action_check;
alter table public.admin_account_action_audit add constraint admin_account_action_audit_action_check
  check (action in ('activate','deactivate','require_re_registration','permanent_block'));

create or replace function public.protect_member_account_status()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if new.account_status is not distinct from old.account_status then
    return new;
  end if;

  if auth.role() = 'service_role'
     or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if auth.role() = 'authenticated'
     and auth.uid() = old.id
     and old.account_status = 're_registration_required'
     and new.account_status = 'active'
     and current_setting('3bigha.re_registration_completion', true) = 'allowed' then
    return new;
  end if;

  raise exception 'Account status can only be changed by authorised administration.'
    using errcode = '42501';
end;
$$;

drop trigger if exists protect_member_account_status_trigger on public.profiles;
create trigger protect_member_account_status_trigger
before update of account_status on public.profiles
for each row execute function public.protect_member_account_status();

create or replace function public.complete_required_re_registration()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  perform set_config('3bigha.re_registration_completion', 'allowed', true);

  update public.profiles
  set account_status = 'active',
      account_status_reason = 'Required re-registration completed',
      account_status_changed_at = now(),
      account_status_changed_by = null
  where id = auth.uid()
    and account_status = 're_registration_required'
    and onboarding_completed = true;
end;
$$;

revoke all on function public.complete_required_re_registration() from public, anon;
grant execute on function public.complete_required_re_registration() to authenticated;

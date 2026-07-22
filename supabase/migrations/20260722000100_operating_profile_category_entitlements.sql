-- 3Bigha Operating Profiles and category entitlements
-- Human-first declaration, deterministic enforcement, AI-assisted guidance.

create table if not exists public.member_operating_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  operating_profile text not null check (operating_profile in ('individual_professional','multi_service_professional','multi_business_organisation')),
  primary_identity_key text not null references public.identity_master(identity_key),
  category_limit integer null check (category_limit is null or category_limit > 0),
  recommended_growth_plan text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (operating_profile = 'individual_professional' and category_limit = 1) or
    (operating_profile = 'multi_service_professional' and category_limit = 5) or
    (operating_profile = 'multi_business_organisation' and category_limit is null)
  )
);

create table if not exists public.member_identity_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_key text not null references public.identity_master(identity_key),
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active','pending_verification','inactive')),
  source text not null default 'registration' check (source in ('registration','plan_upgrade','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, identity_key)
);

create unique index if not exists member_identity_entitlements_one_primary
  on public.member_identity_entitlements(user_id) where is_primary;

alter table public.member_operating_profiles enable row level security;
alter table public.member_identity_entitlements enable row level security;

drop policy if exists member_operating_profiles_read_own on public.member_operating_profiles;
create policy member_operating_profiles_read_own on public.member_operating_profiles
  for select using (auth.uid() = user_id);

drop policy if exists member_identity_entitlements_read_own on public.member_identity_entitlements;
create policy member_identity_entitlements_read_own on public.member_identity_entitlements
  for select using (auth.uid() = user_id);

create or replace function public.declare_operating_profile(
  p_operating_profile text,
  p_identity_keys text[],
  p_primary_identity_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_plan text;
  v_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_operating_profile = 'individual_professional' then v_limit := 1; v_plan := 'individual_growth';
  elsif p_operating_profile = 'multi_service_professional' then v_limit := 5; v_plan := 'multi_service_growth';
  elsif p_operating_profile = 'multi_business_organisation' then v_limit := null; v_plan := 'multi_business_operating';
  else raise exception 'Invalid operating profile'; end if;

  select count(distinct value) into v_count from unnest(coalesce(p_identity_keys, array[]::text[])) value;
  if v_count = 0 or not (p_primary_identity_key = any(p_identity_keys)) then
    raise exception 'A valid primary category is required';
  end if;
  if p_operating_profile = 'multi_service_professional' and v_count < 2 then
    raise exception 'Multi-Service Professional requires at least two categories';
  end if;
  if v_limit is not null and v_count > v_limit then
    raise exception 'CATEGORY_LIMIT_EXCEEDED: this operating profile supports % categories', v_limit;
  end if;
  if exists (select 1 from unnest(p_identity_keys) key left join public.identity_master i on i.identity_key = key and i.is_active where i.identity_key is null) then
    raise exception 'One or more categories are unavailable';
  end if;

  insert into public.member_operating_profiles(user_id, operating_profile, primary_identity_key, category_limit, recommended_growth_plan, updated_at)
  values(v_user_id, p_operating_profile, p_primary_identity_key, v_limit, v_plan, now())
  on conflict(user_id) do update set operating_profile=excluded.operating_profile, primary_identity_key=excluded.primary_identity_key,
    category_limit=excluded.category_limit, recommended_growth_plan=excluded.recommended_growth_plan, updated_at=now();

  delete from public.member_identity_entitlements where user_id = v_user_id and identity_key <> all(p_identity_keys);
  update public.member_identity_entitlements set is_primary=false, updated_at=now() where user_id=v_user_id;
  insert into public.member_identity_entitlements(user_id, identity_key, is_primary, status, source)
  select v_user_id, key, key=p_primary_identity_key,
    case when i.requires_professional_verification then 'pending_verification' else 'active' end,
    'registration'
  from unnest(p_identity_keys) key join public.identity_master i on i.identity_key=key
  on conflict(user_id,identity_key) do update set is_primary=excluded.is_primary, status=excluded.status, updated_at=now();
end;
$$;

create or replace function public.check_category_entitlement(p_identity_key text)
returns table(allowed boolean, reason text, operating_profile text, category_limit integer, current_count integer, recommended_plan text)
language sql
stable
security definer
set search_path = public
as $$
  select
    exists(select 1 from public.member_identity_entitlements e where e.user_id=auth.uid() and e.identity_key=p_identity_key and e.status in ('active','pending_verification')),
    case when exists(select 1 from public.member_identity_entitlements e where e.user_id=auth.uid() and e.identity_key=p_identity_key and e.status in ('active','pending_verification'))
      then 'CATEGORY_ENTITLED' else 'UPGRADE_REQUIRED' end,
    p.operating_profile, p.category_limit,
    (select count(*)::integer from public.member_identity_entitlements e where e.user_id=auth.uid() and e.status <> 'inactive'),
    case when p.operating_profile='individual_professional' then 'multi_service_growth'
         when p.operating_profile='multi_service_professional' then 'multi_business_operating'
         else p.recommended_growth_plan end
  from public.member_operating_profiles p where p.user_id=auth.uid();
$$;

revoke all on function public.declare_operating_profile(text,text[],text) from public;
grant execute on function public.declare_operating_profile(text,text[],text) to authenticated;
revoke all on function public.check_category_entitlement(text) from public;
grant execute on function public.check_category_entitlement(text) to authenticated;

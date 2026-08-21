begin;

create table if not exists public.registration_verification_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique
    references auth.users(id) on delete cascade,
  certificate_number text not null unique,
  verification_status text not null
    check (verification_status in ('auto_verified', 'admin_verified')),
  verified_at timestamptz not null,
  issued_at timestamptz not null default now(),
  issuer text not null default '3Bigha Registration Authority',
  holder_name text,
  business_name text,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  revoked_at timestamptz,
  revoke_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  registration_verification_certificates_number_idx
on public.registration_verification_certificates(certificate_number);

create index if not exists
  registration_verification_certificates_status_idx
on public.registration_verification_certificates(status, issued_at desc);

alter table public.registration_verification_certificates
  enable row level security;

drop policy if exists
  registration_verification_certificates_member_read
on public.registration_verification_certificates;

create policy registration_verification_certificates_member_read
on public.registration_verification_certificates
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists
  registration_verification_certificates_public_verify
on public.registration_verification_certificates;

create policy registration_verification_certificates_public_verify
on public.registration_verification_certificates
for select
to anon
using (status = 'active');

create or replace function public.issue_registration_verification_certificate()
returns jsonb
language plpgsql
security definer
set search_path to public, auth, pg_catalog
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_business_name text;
  v_existing public.registration_verification_certificates%rowtype;
  v_certificate_number text;
  v_verified_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id;

  if not found then
    raise exception 'Registration profile not found.';
  end if;

  if lower(trim(coalesce(v_profile.registration_verification_status, '')))
     not in ('auto_verified', 'admin_verified') then
    raise exception 'A certificate is available only after registration verification.';
  end if;

  select certificate.*
    into v_existing
    from public.registration_verification_certificates certificate
   where certificate.user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'ok', true,
      'certificateId', v_existing.id,
      'certificateNumber', v_existing.certificate_number,
      'issuedAt', v_existing.issued_at,
      'verifiedAt', v_existing.verified_at,
      'status', v_existing.status,
      'existing', true
    );
  end if;

  select nullif(trim(coalesce(
    business.business_name,
    business.legal_name,
    business.trade_name
  )), '')
    into v_business_name
    from public.business_profiles business
   where business.user_id = v_user_id
   limit 1;

  v_verified_at := coalesce(
    v_profile.registration_verified_at,
    now()
  );

  v_certificate_number :=
    '3B-VER-' ||
    to_char(v_verified_at at time zone 'UTC', 'YYYY') ||
    '-' ||
    upper(substr(md5(v_user_id::text), 1, 10));

  insert into public.registration_verification_certificates(
    user_id,
    certificate_number,
    verification_status,
    verified_at,
    holder_name,
    business_name,
    metadata
  )
  values (
    v_user_id,
    v_certificate_number,
    lower(trim(v_profile.registration_verification_status)),
    v_verified_at,
    nullif(trim(coalesce(v_profile.full_name, '')), ''),
    v_business_name,
    jsonb_build_object(
      'registrationScore',
      coalesce(v_profile.registration_verification_score, 0),
      'verificationSource',
      v_profile.registration_verification_source
    )
  )
  returning *
    into v_existing;

  insert into public.registration_verification_events(
    user_id,
    event_type,
    previous_status,
    next_status,
    score,
    reasons,
    evidence_snapshot,
    decision_source,
    decided_by
  )
  values (
    v_user_id,
    'verification_certificate_issued',
    v_profile.registration_verification_status,
    v_profile.registration_verification_status,
    v_profile.registration_verification_score,
    '[]'::jsonb,
    jsonb_build_object(
      'certificateNumber',
      v_existing.certificate_number
    ),
    'certificate_authority',
    v_user_id
  );

  return jsonb_build_object(
    'ok', true,
    'certificateId', v_existing.id,
    'certificateNumber', v_existing.certificate_number,
    'issuedAt', v_existing.issued_at,
    'verifiedAt', v_existing.verified_at,
    'status', v_existing.status,
    'existing', false
  );
end;
$function$;

alter function public.issue_registration_verification_certificate()
  owner to postgres;

revoke all on function
  public.issue_registration_verification_certificate()
from public, anon;

grant execute on function
  public.issue_registration_verification_certificate()
to authenticated, service_role;

revoke all on public.registration_verification_certificates from anon;
grant select on public.registration_verification_certificates to anon;
grant select on public.registration_verification_certificates to authenticated;
grant all on public.registration_verification_certificates to service_role;

commit;

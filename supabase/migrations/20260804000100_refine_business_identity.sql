begin;

alter table public.business_profiles
  add column if not exists business_identities text[] not null default '{}'::text[],
  add column if not exists individual_identities text[] not null default '{}'::text[];

comment on column public.business_profiles.business_identities is
  'Canonical organisation identities selected in the unified Business Identity section. Marketplace nature_of_business is derived from these values.';

comment on column public.business_profiles.individual_identities is
  'Dignified individual professional identities selected by the account holder.';

commit;

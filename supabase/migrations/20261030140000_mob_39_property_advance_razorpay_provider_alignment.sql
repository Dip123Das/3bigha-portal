begin;

/*
 * MOB-39 — Align property-advance records with the selected Razorpay Route
 * provider. This is a provider-identity migration only: it creates no
 * Razorpay order, captures no payment, and does not enable seller transfers.
 */

alter table public.property_unit_booking_advance_requests
  drop constraint if exists
    property_unit_booking_advance_requests_provider_check;

create or replace function
  public.normalize_property_booking_advance_provider()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.provider not in (
    'sbi_payment_gateway',
    'razorpay_route'
  ) then
    raise exception 'PROPERTY_ADVANCE_PROVIDER_INVALID'
      using errcode = '22023';
  end if;

  new.provider := 'razorpay_route';
  return new;
end;
$$;

drop trigger if exists
  normalize_property_booking_advance_provider_trigger
on public.property_unit_booking_advance_requests;

create trigger
  normalize_property_booking_advance_provider_trigger
before insert or update of provider
on public.property_unit_booking_advance_requests
for each row
execute function
  public.normalize_property_booking_advance_provider();

update public.property_unit_booking_advance_requests
set provider = 'razorpay_route'
where provider <> 'razorpay_route';

alter table public.property_unit_booking_advance_requests
  alter column provider set default 'razorpay_route';

alter table public.property_unit_booking_advance_requests
  add constraint property_unit_booking_advance_requests_provider_check
  check (provider = 'razorpay_route');

revoke all on function
  public.normalize_property_booking_advance_provider()
from public, anon, authenticated;

comment on function
  public.normalize_property_booking_advance_provider() is
  'Normalizes legacy property-advance provider labels to Razorpay Route. This does not enable payment collection or transfers.';

commit;

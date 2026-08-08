begin;

-- ============================================================
-- INV-05C — Reservation Lifecycle Automation & Expiry Control
--
-- Expiry is non-physical. ATS already ignores past expires_at.
-- This phase finalizes stale active reservations as "expired"
-- and records a neutral audit event. Canonical stock is unchanged.
-- ============================================================

create or replace view public.bos_material_reservation_lifecycle as
select
  r.id,
  r.user_id,
  r.material_listing_id,
  r.reserved_quantity,
  r.released_quantity,
  r.consumed_quantity,
  greatest(
    r.reserved_quantity - r.released_quantity - r.consumed_quantity,
    0
  )::numeric(18,4) as remaining_quantity,
  r.unit,
  r.status,
  r.source_module,
  r.source_reference_type,
  r.source_reference_id,
  r.note,
  r.expires_at,
  r.created_at,
  r.updated_at,
  case
    when r.status = 'active'
     and r.expires_at is not null
     and r.expires_at <= now()
    then true
    else false
  end as is_expired_now,
  case
    when r.status = 'active'
     and r.expires_at is not null
     and r.expires_at <= now()
    then 'expired_pending_finalize'
    when r.status = 'active'
     and r.expires_at is not null
    then 'active_with_expiry'
    when r.status = 'active'
    then 'active_no_expiry'
    else r.status
  end as lifecycle_state
from public.bos_material_inventory_reservations r;

grant select
on public.bos_material_reservation_lifecycle
to authenticated;

create or replace function public.finalize_bos_expired_material_reservations(
  target_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_row public.bos_material_inventory_reservations%rowtype;
  remaining numeric;
  ledger_result jsonb;
  finalized_count integer := 0;
  skipped_count integer := 0;
begin
  if target_limit is null or target_limit < 1 or target_limit > 500 then
    raise exception 'Expiry finalization limit must be between 1 and 500';
  end if;

  for target_row in
    select r.*
    from public.bos_material_inventory_reservations r
    where r.user_id = auth.uid()
      and r.status = 'active'
      and r.expires_at is not null
      and r.expires_at <= now()
    order by r.expires_at asc
    limit target_limit
    for update skip locked
  loop
    remaining :=
      greatest(
        target_row.reserved_quantity
        - target_row.released_quantity
        - target_row.consumed_quantity,
        0
      );

    if remaining > 0 then
      ledger_result :=
        public.post_bos_material_inventory_transaction(
          target_row.material_listing_id,
          'release_reservation',
          remaining,
          target_row.unit,
          null,
          coalesce(target_row.source_module,'inventory'),
          coalesce(target_row.source_reference_type,'inventory_reservation'),
          coalesce(target_row.source_reference_id,target_row.id::text),
          'inventory-reservation-expiry:' || target_row.id::text,
          'Reservation expired and commitment released',
          jsonb_build_object(
            'reservation_id', target_row.id,
            'expired_quantity', remaining,
            'expired_at', target_row.expires_at,
            'expiry_finalization', true,
            'physical_stock_unchanged', true
          )
        );
    end if;

    update public.bos_material_inventory_reservations
    set
      released_quantity = reserved_quantity - consumed_quantity,
      status = 'expired',
      released_at = coalesce(released_at, now()),
      updated_at = now()
    where id = target_row.id;

    finalized_count := finalized_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'finalized_count', finalized_count,
    'skipped_count', skipped_count,
    'physical_stock_unchanged', true
  );
end;
$$;

revoke all
on function public.finalize_bos_expired_material_reservations(integer)
from public, anon;

grant execute
on function public.finalize_bos_expired_material_reservations(integer)
to authenticated;

commit;

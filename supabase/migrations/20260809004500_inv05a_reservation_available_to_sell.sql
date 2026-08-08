begin;

-- ============================================================
-- INV-05A — Reservation & Available-to-Sell Foundation
--
-- Physical stock remains material_listings.attributes.inventory.current_stock.
-- Reservations are subordinate commitments, not physical stock movements.
--
-- Available to Sell = On Hand - Active Reserved
-- ============================================================

create table if not exists public.bos_material_inventory_reservations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  material_listing_id uuid not null
    references public.material_listings(id) on delete cascade,

  reserved_quantity numeric(18,4) not null check (reserved_quantity > 0),
  released_quantity numeric(18,4) not null default 0
    check (released_quantity >= 0),

  unit text,

  status text not null default 'active'
    check (status in ('active','released','consumed','cancelled','expired')),

  source_module text,
  source_reference_type text,
  source_reference_id text,

  note text,
  expires_at timestamptz,

  reservation_transaction_id uuid
    references public.bos_inventory_transactions(id) on delete set null,

  release_transaction_id uuid
    references public.bos_inventory_transactions(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,

  check (released_quantity <= reserved_quantity)
);

create index if not exists bos_material_inventory_reservations_user_idx
  on public.bos_material_inventory_reservations(user_id, status, created_at desc);

create index if not exists bos_material_inventory_reservations_material_idx
  on public.bos_material_inventory_reservations(material_listing_id, status);

alter table public.bos_material_inventory_reservations enable row level security;

grant select
on public.bos_material_inventory_reservations
to authenticated;

drop policy if exists "Members read own material reservations"
  on public.bos_material_inventory_reservations;

create policy "Members read own material reservations"
on public.bos_material_inventory_reservations
for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.material_listings ml
    where ml.id = bos_material_inventory_reservations.material_listing_id
      and ml.vendor_user_id = auth.uid()
  )
);

create or replace view public.bos_material_available_to_sell as
select
  ml.vendor_user_id as user_id,
  ml.id as material_listing_id,

  coalesce(
    nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,
    0
  )::numeric(18,4) as on_hand_stock,

  coalesce(
    sum(
      case
        when r.status = 'active'
         and (r.expires_at is null or r.expires_at > now())
        then r.reserved_quantity - r.released_quantity
        else 0
      end
    ),
    0
  )::numeric(18,4) as reserved_stock,

  greatest(
    coalesce(
      nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,
      0
    )
    -
    coalesce(
      sum(
        case
          when r.status = 'active'
           and (r.expires_at is null or r.expires_at > now())
          then r.reserved_quantity - r.released_quantity
          else 0
        end
      ),
      0
    ),
    0
  )::numeric(18,4) as available_to_sell,

  nullif(
    trim(coalesce(ml.attributes->'inventory'->>'stock_unit','')),
    ''
  ) as unit

from public.material_listings ml
left join public.bos_material_inventory_reservations r
  on r.material_listing_id = ml.id
group by
  ml.vendor_user_id,
  ml.id,
  ml.attributes;

comment on view public.bos_material_available_to_sell is
  'Derived material availability: canonical physical on-hand minus active subordinate reservations.';

grant select
on public.bos_material_available_to_sell
to authenticated;

-- ------------------------------------------------------------
-- Create reservation.
-- This never changes current_stock.
-- ------------------------------------------------------------

create or replace function public.reserve_bos_material_inventory(
  target_material_listing_id uuid,
  target_quantity numeric,
  target_source_module text default null,
  target_source_reference_type text default null,
  target_source_reference_id text default null,
  target_note text default null,
  target_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  listing_user uuid;
  listing_attributes jsonb;
  inventory_json jsonb;
  on_hand numeric;
  stock_unit text;

  active_reserved numeric;
  available numeric;

  reservation_row public.bos_material_inventory_reservations%rowtype;
  ledger_result jsonb;
  ledger_transaction_id uuid;
begin
  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Reservation quantity must be greater than zero';
  end if;

  select vendor_user_id, attributes
  into listing_user, listing_attributes
  from public.material_listings
  where id = target_material_listing_id
  for update;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  inventory_json :=
    coalesce(listing_attributes->'inventory','{}'::jsonb);

  on_hand :=
    coalesce(
      nullif(inventory_json->>'current_stock','')::numeric,
      0
    );

  stock_unit :=
    nullif(trim(coalesce(inventory_json->>'stock_unit','')), '');

  select coalesce(
    sum(reserved_quantity - released_quantity),
    0
  )
  into active_reserved
  from public.bos_material_inventory_reservations
  where material_listing_id = target_material_listing_id
    and status = 'active'
    and (expires_at is null or expires_at > now());

  available := greatest(on_hand - active_reserved, 0);

  if target_quantity > available then
    raise exception
      'Insufficient available-to-sell stock. On hand: %, reserved: %, available: %, requested: %',
      on_hand,
      active_reserved,
      available,
      target_quantity;
  end if;

  insert into public.bos_material_inventory_reservations (
    user_id,
    material_listing_id,
    reserved_quantity,
    unit,
    status,
    source_module,
    source_reference_type,
    source_reference_id,
    note,
    expires_at
  )
  values (
    auth.uid(),
    target_material_listing_id,
    target_quantity,
    stock_unit,
    'active',
    target_source_module,
    target_source_reference_type,
    target_source_reference_id,
    nullif(trim(coalesce(target_note,'')), ''),
    target_expires_at
  )
  returning * into reservation_row;

  ledger_result :=
    public.post_bos_material_inventory_transaction(
      target_material_listing_id,
      'reservation',
      target_quantity,
      stock_unit,
      null,
      coalesce(target_source_module,'inventory'),
      coalesce(target_source_reference_type,'inventory_reservation'),
      coalesce(target_source_reference_id,reservation_row.id::text),
      'inventory-reservation:' || reservation_row.id::text,
      coalesce(target_note,'Stock reserved'),
      jsonb_build_object(
        'reservation_id', reservation_row.id,
        'reserved_quantity', target_quantity,
        'on_hand_stock', on_hand,
        'reserved_before', active_reserved,
        'reserved_after', active_reserved + target_quantity,
        'available_before', available,
        'available_after', available - target_quantity,
        'physical_stock_unchanged', true
      )
    );

  ledger_transaction_id :=
    nullif(ledger_result->>'transaction_id','')::uuid;

  update public.bos_material_inventory_reservations
  set
    reservation_transaction_id = ledger_transaction_id,
    updated_at = now()
  where id = reservation_row.id;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', reservation_row.id,
    'transaction_id', ledger_transaction_id,
    'on_hand_stock', on_hand,
    'reserved_before', active_reserved,
    'reserved_after', active_reserved + target_quantity,
    'available_before', available,
    'available_after', available - target_quantity,
    'unit', stock_unit
  );
end;
$$;

revoke all
on function public.reserve_bos_material_inventory(
  uuid,numeric,text,text,text,text,timestamptz
)
from public, anon;

grant execute
on function public.reserve_bos_material_inventory(
  uuid,numeric,text,text,text,text,timestamptz
)
to authenticated;

-- ------------------------------------------------------------
-- Release reservation.
-- Full release in INV-05A; physical stock remains unchanged.
-- ------------------------------------------------------------

create or replace function public.release_bos_material_inventory_reservation(
  target_reservation_id uuid,
  target_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  reservation_row public.bos_material_inventory_reservations%rowtype;
  listing_user uuid;
  remaining_reserved numeric;

  ledger_result jsonb;
  ledger_transaction_id uuid;
begin
  select *
  into reservation_row
  from public.bos_material_inventory_reservations
  where id = target_reservation_id
  for update;

  if reservation_row.id is null then
    raise exception 'Reservation not found';
  end if;

  if reservation_row.user_id <> auth.uid() then
    raise exception 'Access denied';
  end if;

  if reservation_row.status <> 'active' then
    return jsonb_build_object(
      'ok', true,
      'already_released', true,
      'reservation_id', reservation_row.id,
      'status', reservation_row.status
    );
  end if;

  select vendor_user_id
  into listing_user
  from public.material_listings
  where id = reservation_row.material_listing_id;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  remaining_reserved :=
    reservation_row.reserved_quantity - reservation_row.released_quantity;

  ledger_result :=
    public.post_bos_material_inventory_transaction(
      reservation_row.material_listing_id,
      'release_reservation',
      remaining_reserved,
      reservation_row.unit,
      null,
      coalesce(reservation_row.source_module,'inventory'),
      coalesce(reservation_row.source_reference_type,'inventory_reservation'),
      coalesce(reservation_row.source_reference_id,reservation_row.id::text),
      'inventory-reservation-release:' || reservation_row.id::text,
      coalesce(
        nullif(trim(coalesce(target_note,'')), ''),
        'Stock reservation released'
      ),
      jsonb_build_object(
        'reservation_id', reservation_row.id,
        'released_quantity', remaining_reserved,
        'physical_stock_unchanged', true
      )
    );

  ledger_transaction_id :=
    nullif(ledger_result->>'transaction_id','')::uuid;

  update public.bos_material_inventory_reservations
  set
    released_quantity = reserved_quantity,
    status = 'released',
    release_transaction_id = ledger_transaction_id,
    released_at = now(),
    updated_at = now()
  where id = reservation_row.id;

  return jsonb_build_object(
    'ok', true,
    'already_released', false,
    'reservation_id', reservation_row.id,
    'released_quantity', remaining_reserved,
    'transaction_id', ledger_transaction_id,
    'physical_stock_unchanged', true
  );
end;
$$;

revoke all
on function public.release_bos_material_inventory_reservation(uuid,text)
from public, anon;

grant execute
on function public.release_bos_material_inventory_reservation(uuid,text)
to authenticated;

commit;

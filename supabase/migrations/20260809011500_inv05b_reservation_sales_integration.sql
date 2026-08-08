begin;

alter table public.bos_material_inventory_reservations
  add column if not exists consumed_quantity numeric(18,4) not null default 0;

alter table public.bos_material_inventory_reservations
  drop constraint if exists bos_material_inventory_reservations_consumed_quantity_check;

alter table public.bos_material_inventory_reservations
  add constraint bos_material_inventory_reservations_consumed_quantity_check
  check (consumed_quantity >= 0);

alter table public.bos_material_inventory_reservations
  drop constraint if exists bos_material_inventory_reservations_commitment_check;

alter table public.bos_material_inventory_reservations
  add constraint bos_material_inventory_reservations_commitment_check
  check (released_quantity + consumed_quantity <= reserved_quantity);

create table if not exists public.bos_material_inventory_reservation_consumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid not null references public.bos_material_inventory_reservations(id) on delete cascade,
  material_listing_id uuid not null references public.material_listings(id) on delete cascade,
  consumed_quantity numeric(18,4) not null check (consumed_quantity > 0),
  unit text,
  sale_transaction_id uuid not null references public.bos_inventory_transactions(id) on delete restrict,
  source_module text,
  source_reference_type text,
  source_reference_id text,
  idempotency_key text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, idempotency_key)
);

alter table public.bos_material_inventory_reservation_consumptions enable row level security;
grant select on public.bos_material_inventory_reservation_consumptions to authenticated;

drop policy if exists "Members read own material reservation consumptions"
  on public.bos_material_inventory_reservation_consumptions;

create policy "Members read own material reservation consumptions"
on public.bos_material_inventory_reservation_consumptions
for select to authenticated
using (user_id = auth.uid());

create or replace view public.bos_material_available_to_sell as
select
  ml.vendor_user_id as user_id,
  ml.id as material_listing_id,
  coalesce(nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,0)::numeric(18,4) as on_hand_stock,
  coalesce(sum(
    case
      when r.status = 'active'
       and (r.expires_at is null or r.expires_at > now())
      then greatest(r.reserved_quantity-r.released_quantity-r.consumed_quantity,0)
      else 0
    end
  ),0)::numeric(18,4) as reserved_stock,
  greatest(
    coalesce(nullif(ml.attributes->'inventory'->>'current_stock','')::numeric,0)
    - coalesce(sum(
        case
          when r.status = 'active'
           and (r.expires_at is null or r.expires_at > now())
          then greatest(r.reserved_quantity-r.released_quantity-r.consumed_quantity,0)
          else 0
        end
      ),0),
    0
  )::numeric(18,4) as available_to_sell,
  nullif(trim(coalesce(ml.attributes->'inventory'->>'stock_unit','')), '') as unit
from public.material_listings ml
left join public.bos_material_inventory_reservations r
  on r.material_listing_id = ml.id
group by ml.vendor_user_id, ml.id, ml.attributes;

grant select on public.bos_material_available_to_sell to authenticated;

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
  select * into reservation_row
  from public.bos_material_inventory_reservations
  where id = target_reservation_id
  for update;

  if reservation_row.id is null then raise exception 'Reservation not found'; end if;
  if reservation_row.user_id <> auth.uid() then raise exception 'Access denied'; end if;

  if reservation_row.status <> 'active' then
    return jsonb_build_object('ok',true,'already_released',true,'reservation_id',reservation_row.id,'status',reservation_row.status);
  end if;

  select vendor_user_id into listing_user
  from public.material_listings
  where id = reservation_row.material_listing_id;

  if listing_user is null or listing_user <> auth.uid() then
    raise exception 'Material inventory item not found or access denied';
  end if;

  remaining_reserved :=
    reservation_row.reserved_quantity
    - reservation_row.released_quantity
    - reservation_row.consumed_quantity;

  if remaining_reserved <= 0 then
    update public.bos_material_inventory_reservations
    set status='consumed', updated_at=now()
    where id=reservation_row.id;

    return jsonb_build_object('ok',true,'already_released',true,'reservation_id',reservation_row.id,'status','consumed');
  end if;

  ledger_result := public.post_bos_material_inventory_transaction(
    reservation_row.material_listing_id,
    'release_reservation',
    remaining_reserved,
    reservation_row.unit,
    null,
    coalesce(reservation_row.source_module,'inventory'),
    coalesce(reservation_row.source_reference_type,'inventory_reservation'),
    coalesce(reservation_row.source_reference_id,reservation_row.id::text),
    'inventory-reservation-release:' || reservation_row.id::text,
    coalesce(nullif(trim(coalesce(target_note,'')),''),'Stock reservation released'),
    jsonb_build_object(
      'reservation_id',reservation_row.id,
      'released_quantity',remaining_reserved,
      'consumed_quantity',reservation_row.consumed_quantity,
      'physical_stock_unchanged',true
    )
  );

  ledger_transaction_id := nullif(ledger_result->>'transaction_id','')::uuid;

  update public.bos_material_inventory_reservations
  set
    released_quantity = released_quantity + remaining_reserved,
    status='released',
    release_transaction_id=ledger_transaction_id,
    released_at=now(),
    updated_at=now()
  where id=reservation_row.id;

  return jsonb_build_object(
    'ok',true,
    'already_released',false,
    'reservation_id',reservation_row.id,
    'released_quantity',remaining_reserved,
    'consumed_quantity',reservation_row.consumed_quantity,
    'transaction_id',ledger_transaction_id,
    'physical_stock_unchanged',true
  );
end;
$$;

create or replace function public.consume_bos_material_reservation_on_sale(
  target_reservation_id uuid,
  target_quantity numeric,
  target_unit text default null,
  target_source_module text default 'billing',
  target_source_reference_type text default 'inventory_bill',
  target_source_reference_id text default null,
  target_idempotency_key text default null,
  target_note text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  reservation_row public.bos_material_inventory_reservations%rowtype;
  existing_consumption public.bos_material_inventory_reservation_consumptions%rowtype;
  remaining_reserved numeric;
  sale_result jsonb;
  sale_transaction_id uuid;
  next_consumed numeric;
  next_status text;
begin
  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Sale quantity must be greater than zero';
  end if;
  if target_idempotency_key is null or trim(target_idempotency_key)='' then
    raise exception 'Reservation sale idempotency key is required';
  end if;

  select * into existing_consumption
  from public.bos_material_inventory_reservation_consumptions
  where user_id=auth.uid() and idempotency_key=target_idempotency_key;

  if existing_consumption.id is not null then
    return jsonb_build_object(
      'ok',true,'already_posted',true,
      'reservation_id',existing_consumption.reservation_id,
      'consumption_id',existing_consumption.id,
      'sale_transaction_id',existing_consumption.sale_transaction_id,
      'consumed_quantity',existing_consumption.consumed_quantity
    );
  end if;

  select * into reservation_row
  from public.bos_material_inventory_reservations
  where id=target_reservation_id
  for update;

  if reservation_row.id is null then raise exception 'Reservation not found'; end if;
  if reservation_row.user_id <> auth.uid() then raise exception 'Access denied'; end if;
  if reservation_row.status <> 'active' then raise exception 'Reservation is not active'; end if;
  if reservation_row.expires_at is not null and reservation_row.expires_at <= now() then
    raise exception 'Reservation has expired';
  end if;

  remaining_reserved :=
    reservation_row.reserved_quantity
    - reservation_row.released_quantity
    - reservation_row.consumed_quantity;

  if target_quantity > remaining_reserved then
    raise exception 'Sale quantity exceeds remaining reservation. Remaining: %, requested: %',
      remaining_reserved,target_quantity;
  end if;

  sale_result := public.post_bos_material_inventory_transaction(
    reservation_row.material_listing_id,
    'sale',
    target_quantity,
    coalesce(nullif(trim(target_unit),''),reservation_row.unit),
    null,
    target_source_module,
    target_source_reference_type,
    target_source_reference_id,
    target_idempotency_key,
    coalesce(target_note,'Reserved stock sold'),
    coalesce(target_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'reservation_id',reservation_row.id,
        'reservation_consumption',true,
        'reserved_quantity_before',remaining_reserved
      )
  );

  sale_transaction_id := nullif(sale_result->>'transaction_id','')::uuid;
  next_consumed := reservation_row.consumed_quantity + target_quantity;
  next_status := case
    when reservation_row.released_quantity + next_consumed >= reservation_row.reserved_quantity
    then 'consumed'
    else 'active'
  end;

  insert into public.bos_material_inventory_reservation_consumptions (
    user_id,reservation_id,material_listing_id,consumed_quantity,unit,
    sale_transaction_id,source_module,source_reference_type,source_reference_id,
    idempotency_key,note,metadata
  )
  values (
    auth.uid(),reservation_row.id,reservation_row.material_listing_id,target_quantity,
    coalesce(nullif(trim(target_unit),''),reservation_row.unit),
    sale_transaction_id,target_source_module,target_source_reference_type,target_source_reference_id,
    target_idempotency_key,target_note,coalesce(target_metadata,'{}'::jsonb)
  )
  returning * into existing_consumption;

  update public.bos_material_inventory_reservations
  set consumed_quantity=next_consumed,status=next_status,updated_at=now()
  where id=reservation_row.id;

  return jsonb_build_object(
    'ok',true,'already_posted',false,
    'reservation_id',reservation_row.id,
    'consumption_id',existing_consumption.id,
    'sale_transaction_id',sale_transaction_id,
    'consumed_quantity',target_quantity,
    'reservation_remaining',
      reservation_row.reserved_quantity-reservation_row.released_quantity-next_consumed,
    'reservation_status',next_status,
    'stock_before',sale_result->'stock_before',
    'stock_after',sale_result->'stock_after'
  );
end;
$$;

revoke all on function public.consume_bos_material_reservation_on_sale(
  uuid,numeric,text,text,text,text,text,text,jsonb
) from public, anon;

grant execute on function public.consume_bos_material_reservation_on_sale(
  uuid,numeric,text,text,text,text,text,text,jsonb
) to authenticated;

commit;

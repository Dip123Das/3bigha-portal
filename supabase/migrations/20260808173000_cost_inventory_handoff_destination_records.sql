begin;

-- COST-01E.2
-- Destination confirmation may create one seller listing or many builder units.
alter table public.bos_cost_inventory_handoffs
  add column if not exists destination_record_ids uuid[] not null default '{}'::uuid[];

comment on column public.bos_cost_inventory_handoffs.destination_record_ids is
  'Destination records created from this confirmed handoff. Seller inventory normally has one id; builder outputs may create multiple unit ids.';

commit;

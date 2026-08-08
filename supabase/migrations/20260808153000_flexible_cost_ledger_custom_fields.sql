begin;

-- ============================================================
-- COST-01B
-- Flexible Production / Project Cost Ledger
--
-- Human-first rule:
-- Keep a small protected accounting core, but allow each business
-- to add its own columns without database-schema changes.
--
-- Examples:
--   Jungle clearing labour
--   Vehicle fare
--   Worker / mistri name
--   Vehicle number
--   Machine hours
--   Site / tower / floor
--   Supplier invoice date
--   Any future user-defined production detail
-- ============================================================

create table if not exists public.bos_cost_custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- null plan_id means reusable across the user's cost registers.
  plan_id uuid references public.bos_cost_plans(id) on delete cascade,

  field_key text not null,
  label text not null,

  field_type text not null default 'text'
    check (
      field_type in (
        'text',
        'number',
        'currency',
        'date',
        'boolean',
        'select'
      )
    ),

  options jsonb not null default '[]'::jsonb,
  default_value jsonb,

  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 1000,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bos_cost_custom_fields_key_format
    check (field_key ~ '^[a-z0-9_]+$'),

  constraint bos_cost_custom_fields_label_nonempty
    check (length(trim(label)) >= 1)
);

comment on table public.bos_cost_custom_fields is
  'User-defined cost-ledger columns. They extend the human-facing register without altering the physical database schema.';

create unique index if not exists
  bos_cost_custom_fields_plan_key_unique
on public.bos_cost_custom_fields(
  user_id,
  coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid),
  field_key
);

create index if not exists
  bos_cost_custom_fields_plan_sort_idx
on public.bos_cost_custom_fields(user_id, plan_id, is_active, sort_order);

create table if not exists public.bos_cost_entry_custom_values (
  entry_id uuid not null
    references public.bos_cost_entries(id)
    on delete cascade,

  field_id uuid not null
    references public.bos_cost_custom_fields(id)
    on delete cascade,

  value jsonb,

  updated_at timestamptz not null default now(),

  primary key (entry_id, field_id)
);

comment on table public.bos_cost_entry_custom_values is
  'Values for user-defined ledger columns on actual production/project cost entries.';

create index if not exists
  bos_cost_entry_custom_values_field_idx
on public.bos_cost_entry_custom_values(field_id, entry_id);

-- Add a flexible row-detail bag as a compatibility/import surface.
-- Structured user-defined columns should normally use the two tables
-- above so headings can be ordered, renamed and reused.
alter table public.bos_cost_entries
  add column if not exists custom_data jsonb not null default '{}'::jsonb;

comment on column public.bos_cost_entries.custom_data is
  'Flexible row-level details for imports/compatibility. Normal custom ledger columns use bos_cost_custom_fields + bos_cost_entry_custom_values.';

-- ============================================================
-- Totals must be derived from actual entries.
-- The summary on bos_cost_plans is maintained by one database
-- command rather than arbitrary browser edits.
-- ============================================================

create or replace function public.refresh_bos_cost_plan_actual_total(
  target_plan_id uuid
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid;
  new_total numeric(18,2);
begin
  select user_id
  into owner_id
  from public.bos_cost_plans
  where id = target_plan_id;

  if owner_id is null or owner_id <> auth.uid() then
    raise exception 'Cost plan not found or access denied';
  end if;

  select coalesce(sum(amount), 0)::numeric(18,2)
  into new_total
  from public.bos_cost_entries
  where plan_id = target_plan_id;

  update public.bos_cost_plans
  set
    actual_total = new_total,
    updated_at = now()
  where id = target_plan_id
    and user_id = auth.uid();

  return new_total;
end;
$$;

revoke all
on function public.refresh_bos_cost_plan_actual_total(uuid)
from public, anon;

grant execute
on function public.refresh_bos_cost_plan_actual_total(uuid)
to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.bos_cost_custom_fields enable row level security;
alter table public.bos_cost_entry_custom_values enable row level security;

grant select, insert, update, delete
on public.bos_cost_custom_fields,
   public.bos_cost_entry_custom_values
to authenticated;

drop policy if exists "Members manage own BOS cost custom fields"
  on public.bos_cost_custom_fields;

create policy "Members manage own BOS cost custom fields"
on public.bos_cost_custom_fields
for all
to authenticated
using (
  user_id = auth.uid()
  and (
    plan_id is null
    or exists (
      select 1
      from public.bos_cost_plans plan
      where plan.id = bos_cost_custom_fields.plan_id
        and plan.user_id = auth.uid()
    )
  )
)
with check (
  user_id = auth.uid()
  and (
    plan_id is null
    or exists (
      select 1
      from public.bos_cost_plans plan
      where plan.id = bos_cost_custom_fields.plan_id
        and plan.user_id = auth.uid()
    )
  )
);

drop policy if exists "Members manage own BOS cost entry custom values"
  on public.bos_cost_entry_custom_values;

create policy "Members manage own BOS cost entry custom values"
on public.bos_cost_entry_custom_values
for all
to authenticated
using (
  exists (
    select 1
    from public.bos_cost_entries entry
    join public.bos_cost_plans plan
      on plan.id = entry.plan_id
    join public.bos_cost_custom_fields field
      on field.id = bos_cost_entry_custom_values.field_id
    where entry.id = bos_cost_entry_custom_values.entry_id
      and plan.user_id = auth.uid()
      and field.user_id = auth.uid()
      and (
        field.plan_id is null
        or field.plan_id = entry.plan_id
      )
  )
)
with check (
  exists (
    select 1
    from public.bos_cost_entries entry
    join public.bos_cost_plans plan
      on plan.id = entry.plan_id
    join public.bos_cost_custom_fields field
      on field.id = bos_cost_entry_custom_values.field_id
    where entry.id = bos_cost_entry_custom_values.entry_id
      and plan.user_id = auth.uid()
      and field.user_id = auth.uid()
      and (
        field.plan_id is null
        or field.plan_id = entry.plan_id
      )
  )
);

commit;

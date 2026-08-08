begin;

-- ============================================================
-- COST-02A
-- Production / Project Planning & Consumption Control
--
-- Extends the existing canonical BOM/BOQ line table.
-- Actuals remain bos_cost_entries linked through plan_line_id.
-- ============================================================

alter table public.bos_cost_plan_lines
  add column if not exists revised_quantity numeric(18,4);

alter table public.bos_cost_plan_lines
  drop constraint if exists bos_cost_plan_lines_revised_quantity_nonnegative;

alter table public.bos_cost_plan_lines
  add constraint bos_cost_plan_lines_revised_quantity_nonnegative
  check (revised_quantity is null or revised_quantity >= 0);

comment on column public.bos_cost_plan_lines.revised_quantity is
  'Optional revised planned quantity. Null means use the original quantity as the current plan.';

create index if not exists bos_cost_entries_plan_line_idx
  on public.bos_cost_entries(plan_line_id, entry_date, created_at)
  where plan_line_id is not null;

commit;

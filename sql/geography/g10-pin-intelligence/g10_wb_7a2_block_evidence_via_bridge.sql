drop table if exists public.geo_wb_block_pin_evidence;

create table public.geo_wb_block_pin_evidence as
with mapped as (
  select
    bv.lgd_district_code,
    d.name_en as district_name,
    bv.lgd_block_code,
    bv.block_name_en as block_name,
    v.pincode,
    count(*) as mapped_villages_with_pin
  from public.geo_lgd_block_villages bv
  join public.geo_lgd_villages v
    on v.lgd_village_code = bv.lgd_village_code
  join public.geo_lgd_districts d
    on d.lgd_district_code = bv.lgd_district_code
  where bv.lgd_state_code = 19
    and d.lgd_state_code = 19
    and v.is_active = true
    and nullif(trim(coalesce(v.pincode, '')), '') is not null
  group by
    bv.lgd_district_code,
    d.name_en,
    bv.lgd_block_code,
    bv.block_name_en,
    v.pincode
),
totals as (
  select
    lgd_district_code,
    lgd_block_code,
    sum(mapped_villages_with_pin) as total_mapped_in_block
  from mapped
  group by lgd_district_code, lgd_block_code
),
ranked as (
  select
    m.*,
    t.total_mapped_in_block,
    round((m.mapped_villages_with_pin::numeric / nullif(t.total_mapped_in_block, 0)) * 100, 2) as pin_share_percent,
    row_number() over (
      partition by m.lgd_district_code, m.lgd_block_code
      order by m.mapped_villages_with_pin desc, m.pincode
    ) as rn
  from mapped m
  join totals t
    on t.lgd_district_code = m.lgd_district_code
   and t.lgd_block_code = m.lgd_block_code
)
select *
from ranked
where rn = 1;

select
  count(*) as blocks_with_pin_evidence,
  count(*) filter (where total_mapped_in_block >= 5 and pin_share_percent >= 90) as blocks_90_plus,
  count(*) filter (where total_mapped_in_block >= 5 and pin_share_percent >= 80) as blocks_80_plus,
  count(*) filter (where total_mapped_in_block >= 3 and pin_share_percent = 100) as single_pin_blocks
from public.geo_wb_block_pin_evidence;

select
  lgd_district_code,
  district_name,
  count(*) as blocks_with_evidence,
  count(*) filter (where total_mapped_in_block >= 5 and pin_share_percent >= 90) as blocks_90_plus,
  count(*) filter (where total_mapped_in_block >= 5 and pin_share_percent >= 80) as blocks_80_plus,
  count(*) filter (where total_mapped_in_block >= 3 and pin_share_percent = 100) as single_pin_blocks
from public.geo_wb_block_pin_evidence
group by lgd_district_code, district_name
order by blocks_90_plus desc, blocks_80_plus desc, district_name;

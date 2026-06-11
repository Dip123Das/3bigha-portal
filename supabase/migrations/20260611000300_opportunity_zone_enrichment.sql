alter table marketplace_opportunity_zones
add column if not exists kind text;

alter table marketplace_opportunity_zones
add column if not exists recommendation text;

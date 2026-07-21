-- 3BOS constitutional identity master: extensible without application releases.
create table if not exists public.identity_master (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null unique check (identity_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  family_key text not null,
  lifecycle_stage text not null default 'operations',
  workspace_label text not null,
  description text not null,
  provider_forms text[] not null default array['individual','organisation']::text[],
  engagement_models text[] not null default array['direct_service']::text[],
  aliases text[] not null default '{}'::text[],
  legacy_role text not null default 'vendor',
  legacy_modules text[] not null default array['services']::text[],
  requires_business_onboarding boolean not null default true,
  requires_professional_verification boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create table if not exists public.identity_master_audit (
  id bigint generated always as identity primary key,
  identity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists identity_master_browse_idx
  on public.identity_master (is_active, family_key, sort_order, label);

alter table public.identity_master enable row level security;
alter table public.identity_master_audit enable row level security;

drop policy if exists "Public reads active identity master" on public.identity_master;
create policy "Public reads active identity master" on public.identity_master
  for select using (is_active or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master_admin'
  ));

drop policy if exists "Master admin manages identity master" on public.identity_master;
create policy "Master admin manages identity master" on public.identity_master
  for all using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master_admin'
  )) with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master_admin'
  ));

drop policy if exists "Master admin reads identity audit" on public.identity_master_audit;
create policy "Master admin reads identity audit" on public.identity_master_audit
  for select using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'master_admin'
  ));

create or replace function public.audit_identity_master_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.identity_master_audit(identity_id, action, before_data, after_data, changed_by)
  values (coalesce(new.id, old.id), tg_op, to_jsonb(old), to_jsonb(new), auth.uid());
  if tg_op = 'DELETE' then return old; end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists identity_master_audit_trigger on public.identity_master;
create trigger identity_master_audit_trigger
before insert or update or delete on public.identity_master
for each row execute function public.audit_identity_master_change();

-- Broad first catalogue. Provider form stays separate from work identity to avoid
-- repetitive combinations such as "Pvt Ltd Excavator Rental Provider".
insert into public.identity_master
  (identity_key,label,family_key,lifecycle_stage,workspace_label,description,provider_forms,engagement_models,aliases,legacy_role,legacy_modules,requires_business_onboarding,requires_professional_verification,is_featured,sort_order)
values
('customer','Customer','customer','need','My Requirements','A person looking to build, buy, sell, hire or rent.',array['individual'],array['buyer'],array['buyer','client'],'buyer','{}',false,false,true,10),
('property_owner','Property / Land Owner','property_real_estate','land','Property Workspace','An owner selling, leasing, developing or managing property.',array['individual','organisation'],array['owner_direct','joint_development'],array['land owner','lessor'],'vendor',array['property_owner'],true,false,true,20),
('real_estate_developer','Real Estate Developer / Promoter','property_real_estate','development','Developer Workspace','A promoter or organisation developing real-estate projects.',array['individual','proprietorship','partnership','llp','private_limited','public_limited'],array['development','joint_development','turnkey'],array['builder','promoter'],'builder',array['property_builder'],true,false,true,30),
('property_broker','Property Broker / Real Estate Agent','property_real_estate','transaction','Property Professional Workspace','A person or agency facilitating sale, purchase or lease.',array['individual','agency','firm','company'],array['consultancy','brokerage'],array['broker','agent','realtor'],'vendor',array['property_owner','services'],true,false,true,40),
('land_surveyor','Land Surveyor (Amin)','professional','land','Survey Workspace','Land measurement, demarcation and survey services.',array['individual','firm','company'],array['direct_service','contract'],array['amin','surveyor'],'vendor',array['services'],true,true,true,50),
('architect','Architect / Architectural Firm','professional','planning','Architecture Workspace','Architectural planning, drawings and professional services.',array['individual','firm','llp','private_limited'],array['consultancy','design_only','design_build'],array['architecture firm'],'vendor',array['services'],true,true,true,60),
('civil_engineer','Civil Engineer / Engineering Consultant','professional','planning','Engineering Workspace','Civil engineering, estimation, supervision or consulting.',array['individual','firm','company'],array['consultancy','direct_service','contract'],array['site engineer'],'vendor',array['services'],true,true,true,70),
('structural_engineer','Structural Engineer / Consultant','professional','planning','Structural Engineering Workspace','Structural design, analysis and certification.',array['individual','firm','company'],array['consultancy','design_only'],array['structural consultant'],'vendor',array['services'],true,true,false,80),
('mep_consultant','MEP Consultant','professional','planning','MEP Consultancy Workspace','Mechanical, electrical and plumbing design coordination.',array['individual','firm','company'],array['consultancy','design_only'],'{}','vendor',array['services'],true,true,false,90),
('project_management_consultant','Project Management Consultant (PMC)','professional','execution','Project Management Workspace','Planning, coordination, cost, quality and schedule management.',array['individual','firm','llp','private_limited'],array['consultancy','management_contract'],array['pmc'],'vendor',array['services'],true,false,false,100),
('quantity_surveyor','Quantity Surveyor / Estimator','professional','planning','Cost Management Workspace','Quantity take-off, BOQ, estimation and cost control.',array['individual','firm','company'],array['consultancy','direct_service'],array['estimator','boq consultant'],'vendor',array['services'],true,false,false,110),
('approval_consultant','Building Approval / Liaison Consultant','legal_compliance','approval','Approval Workspace','Building-plan approval and authority liaison support.',array['individual','firm','agency'],array['consultancy','direct_service'],array['sanction consultant','liaison'],'vendor',array['services'],true,false,false,120),
('geotechnical_consultant','Geotechnical / Soil Testing Consultant','professional','site_preparation','Geotechnical Workspace','Soil investigation, testing and foundation advice.',array['individual','laboratory','firm','company'],array['testing','consultancy','contract'],array['soil tester'],'vendor',array['services'],true,true,false,130),
('turnkey_contractor','Turnkey Construction Contractor / Company','construction','execution','Turnkey Construction Workspace','Complete project delivery from planning or structure through handover.',array['individual','proprietorship','partnership','llp','private_limited','public_limited'],array['turnkey','design_build','labour_material'],array['complete construction','full contract'],'vendor',array['services','property_builder'],true,false,true,140),
('epc_contractor','EPC Contractor / Company','construction','execution','EPC Workspace','Engineering, procurement and construction under one responsibility.',array['partnership','llp','private_limited','public_limited'],array['epc','turnkey'],'{}','vendor',array['services','property_builder'],true,false,false,150),
('civil_contractor','Civil Contractor','construction','structure','Civil Contract Workspace','Civil, RCC, masonry and structural execution.',array['individual','proprietorship','firm','company'],array['labour_only','labour_material','item_rate','turnkey'],'{}','vendor',array['services'],true,false,true,160),
('labour_contractor','Construction Labour Contractor','construction','execution','Labour Contract Workspace','Supplies and manages construction labour teams.',array['individual','proprietorship','firm','agency'],array['labour_only','rate_contract'],array['manpower contractor'],'vendor',array['services'],true,false,false,170),
('demolition_contractor','Demolition Contractor','construction','site_preparation','Demolition Workspace','Manual or machine demolition, dismantling and debris handling.',array['individual','firm','company'],array['labour_only','equipment_with_operator','turnkey'],array['dismantling contractor'],'vendor',array['services','rentals'],true,false,false,180),
('excavation_contractor','Earthwork / Excavation Contractor','construction','site_preparation','Earthwork Workspace','Excavation, filling, grading and earth removal.',array['individual','firm','company'],array['item_rate','equipment_with_operator','turnkey'],array['earth mover'],'vendor',array['services','rentals'],true,false,false,190),
('piling_contractor','Piling / Foundation Contractor','construction','foundation','Foundation Workspace','Piling, deep foundation and specialist foundation work.',array['firm','company'],array['specialist_contract','labour_material','turnkey'],'{}','vendor',array['services'],true,false,false,200),
('masonry_contractor','Masonry Contractor','construction','structure','Masonry Contract Workspace','Brick, block, stone and plaster masonry contracts.',array['individual','team','firm'],array['labour_only','labour_material','item_rate'],array['rajmistri contractor'],'vendor',array['services'],true,false,false,210),
('roofing_contractor','Roofing Contractor','construction','envelope','Roofing Contract Workspace','Roof construction, repair, sheets, tiles and roof systems.',array['individual','firm','company'],array['labour_only','labour_material','turnkey'],'{}','vendor',array['services'],true,false,false,220),
('waterproofing_contractor','Waterproofing Contractor','construction','envelope','Waterproofing Workspace','Terrace, basement, bathroom and structural waterproofing.',array['individual','firm','company'],array['labour_material','specialist_contract','warranty_contract'],'{}','vendor',array['services'],true,false,true,230),
('electrical_contractor','Electrical Contractor','construction','services','Electrical Contract Workspace','Electrical wiring, power, panels and installation contracts.',array['individual','firm','company'],array['labour_only','labour_material','turnkey','amc'],array['licensed electrical contractor'],'vendor',array['services'],true,true,true,240),
('plumbing_contractor','Plumbing / Sanitary Contractor','construction','services','Plumbing Contract Workspace','Water supply, drainage, sanitary and plumbing contracts.',array['individual','firm','company'],array['labour_only','labour_material','turnkey','amc'],'{}','vendor',array['services'],true,false,true,250),
('hvac_contractor','HVAC / Air-Conditioning Contractor','construction','services','HVAC Workspace','Heating, ventilation, air-conditioning and ducting work.',array['individual','firm','company'],array['installation','turnkey','amc'],array['ac contractor','ducting contractor'],'vendor',array['services'],true,false,false,260),
('fire_safety_contractor','Fire Safety Contractor','construction','services','Fire Safety Workspace','Fire detection, alarm, hydrant and suppression systems.',array['firm','company'],array['installation','turnkey','amc'],array['fire fighting contractor'],'vendor',array['services'],true,true,false,270),
('lift_contractor','Lift / Elevator Contractor','construction','services','Lift Workspace','Elevator supply, installation, modernisation and maintenance.',array['firm','company'],array['installation','turnkey','amc'],array['elevator company'],'vendor',array['services'],true,true,false,280),
('solar_contractor','Solar Installation Contractor','construction','services','Solar Workspace','Rooftop or ground-mounted solar installation and maintenance.',array['individual','firm','company'],array['installation','epc','amc'],array['solar installer'],'vendor',array['services'],true,false,false,290),
('security_system_contractor','CCTV / Security System Contractor','construction','services','Security Systems Workspace','CCTV, access control, intercom and security systems.',array['individual','firm','company'],array['installation','turnkey','amc'],array['cctv installer'],'vendor',array['services'],true,false,false,300),
('painting_contractor','Painting Contractor','construction','finishing','Painting Contract Workspace','Interior, exterior, texture, polish and protective coating contracts.',array['individual','team','firm','company'],array['labour_only','labour_material','item_rate','turnkey'],array['paint contractor'],'vendor',array['services'],true,false,true,310),
('interior_designer','Interior Designer','professional','interiors','Interior Design Workspace','Interior space planning, design, drawings and material selection.',array['individual','studio','firm','company'],array['consultancy','design_only','design_build'],array['interior architect'],'vendor',array['services'],true,false,true,320),
('interior_contractor','Interior Contractor / Turnkey Interior Company','construction','interiors','Interior Execution Workspace','Interior execution, furnishing and complete turnkey interiors.',array['individual','firm','llp','private_limited'],array['labour_only','labour_material','design_build','turnkey'],array['interior company'],'vendor',array['services'],true,false,true,330),
('false_ceiling_contractor','False Ceiling Contractor','construction','interiors','False Ceiling Workspace','Gypsum, grid, POP and specialist ceiling work.',array['individual','team','firm'],array['labour_only','labour_material','item_rate'],'{}','vendor',array['services'],true,false,false,340),
('flooring_contractor','Flooring / Tiling Contractor','construction','finishing','Flooring Workspace','Tile, stone, wood, vinyl and other floor installation.',array['individual','team','firm','company'],array['labour_only','labour_material','item_rate'],array['tile contractor'],'vendor',array['services'],true,false,false,350),
('carpentry_contractor','Carpentry / Modular Furniture Contractor','construction','interiors','Carpentry Contract Workspace','Doors, windows, furniture, modular kitchen and woodwork.',array['individual','team','workshop','firm','company'],array['labour_only','labour_material','turnkey'],array['woodwork contractor'],'vendor',array['services'],true,false,false,360),
('fabrication_contractor','Steel / Aluminium Fabrication Contractor','construction','finishing','Fabrication Contract Workspace','Structural steel, gates, grills, railings and aluminium work.',array['individual','workshop','firm','company'],array['labour_only','labour_material','item_rate'],array['metal fabricator'],'vendor',array['services'],true,false,false,370),
('glass_glazing_contractor','Glass / Glazing Contractor','construction','envelope','Glazing Workspace','Glass partitions, façades, windows and glazing systems.',array['individual','firm','company'],array['supply_install','specialist_contract','turnkey'],'{}','vendor',array['services'],true,false,false,380),
('facade_contractor','Façade Contractor','construction','envelope','Façade Workspace','Building façade, cladding and exterior envelope systems.',array['firm','company'],array['design_build','specialist_contract','turnkey'],array['cladding contractor'],'vendor',array['services'],true,false,false,390),
('landscaping_contractor','Landscaping Contractor','construction','external_works','Landscaping Workspace','Softscape, hardscape, garden and outdoor works.',array['individual','nursery','firm','company'],array['design_only','labour_material','turnkey','maintenance'],array['garden contractor'],'vendor',array['services'],true,false,false,400),
('road_contractor','Road / Paving Contractor','construction','external_works','Road Works Workspace','Road, driveway, paving, kerb and drainage execution.',array['firm','company'],array['item_rate','labour_material','turnkey'],array['paver contractor'],'vendor',array['services'],true,false,false,410),
('building_repair_contractor','Building Repair / Renovation Contractor','construction','maintenance','Repair Workspace','Repair, alteration, restoration and renovation work.',array['individual','team','firm','company'],array['labour_only','labour_material','turnkey','amc'],array['renovation contractor'],'vendor',array['services'],true,false,true,420),
('facility_management_company','Facility Management / Maintenance Company','construction','maintenance','Facility Management Workspace','Integrated property operations, housekeeping and maintenance.',array['agency','firm','private_limited','public_limited'],array['amc','management_contract','manpower_contract'],array['fm company'],'vendor',array['services'],true,false,false,430),
('mason','Mason (Rajmistri)','skilled_workforce','structure','Mason Workspace','Individual skilled masonry professional.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['rajmistri'],'vendor',array['services'],true,false,true,500),
('carpenter','Carpenter','skilled_workforce','interiors','Carpenter Workspace','Individual skilled carpenter or furniture maker.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['chhutor mistri'],'vendor',array['services'],true,false,false,510),
('electrician','Electrician','skilled_workforce','services','Electrician Workspace','Individual electrical technician.',array['individual'],array['daily_wage','piece_rate','direct_service'],'{}','vendor',array['services'],true,false,false,520),
('plumber','Plumber','skilled_workforce','services','Plumber Workspace','Individual plumbing and sanitary technician.',array['individual'],array['daily_wage','piece_rate','direct_service'],'{}','vendor',array['services'],true,false,false,530),
('painter','Painter / Polisher','skilled_workforce','finishing','Painter Workspace','Individual painter, polisher or coating worker.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['paint mistri'],'vendor',array['services'],true,false,true,540),
('tile_installer','Tile / Marble Installer','skilled_workforce','finishing','Tile Installer Workspace','Individual tile, marble or stone installer.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['tile mistri'],'vendor',array['services'],true,false,false,550),
('welder_fabricator','Welder / Fabricator','skilled_workforce','finishing','Fabricator Workspace','Individual welding and metal fabrication professional.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['welder'],'vendor',array['services'],true,false,false,560),
('bar_bender','Bar Bender / Steel Fixer','skilled_workforce','structure','Steel Fixer Workspace','Individual reinforcement cutting, bending and fixing worker.',array['individual'],array['daily_wage','piece_rate','labour_only'],array['rod binder'],'vendor',array['services'],true,false,false,570),
('machine_operator','Construction Machine Operator','skilled_workforce','site_preparation','Machine Operator Workspace','Operator for excavators, cranes, loaders or other equipment.',array['individual'],array['daily_wage','equipment_with_operator'],array['equipment operator'],'vendor',array['services','rentals'],true,false,false,580),
('equipment_rental_provider','Equipment / Machinery Rental Provider','equipment_rental','equipment','Rental Workspace','Rentable construction equipment from one machine to a large fleet.',array['individual','proprietorship','partnership','llp','private_limited','public_limited'],array['equipment_only','equipment_with_operator','short_term','long_term'],array['machine hire','plant hire'],'vendor',array['rentals'],true,false,true,600),
('small_tools_rental_provider','Small Tools Rental Provider','equipment_rental','equipment','Tools Rental Workspace','Small power tools, hand tools, ladders and site tools on rent.',array['individual','shop','proprietorship','firm'],array['equipment_only','short_term'],array['tool hire'],'vendor',array['rentals'],true,false,true,610),
('heavy_equipment_rental_company','Heavy Equipment Rental Company','equipment_rental','equipment','Heavy Equipment Workspace','Fleet rental of excavators, loaders, dozers, graders and heavy plant.',array['firm','llp','private_limited','public_limited'],array['equipment_only','equipment_with_operator','long_term','rate_contract'],array['heavy machinery hire'],'vendor',array['rentals'],true,false,false,620),
('crane_rental_provider','Crane / Lifting Equipment Rental Provider','equipment_rental','equipment','Crane Rental Workspace','Mobile cranes, tower cranes, hydra and lifting equipment.',array['individual','firm','company'],array['equipment_only','equipment_with_operator','rate_contract'],array['hydra rental'],'vendor',array['rentals','services'],true,false,false,630),
('scaffolding_rental_provider','Scaffolding / Shuttering Rental Provider','equipment_rental','equipment','Scaffolding Rental Workspace','Scaffolding, props, shuttering plates and formwork rental.',array['individual','firm','company'],array['equipment_only','supply_install','long_term'],array['centering material rental'],'vendor',array['rentals'],true,false,false,640),
('concrete_equipment_rental_provider','Concrete Equipment Rental Provider','equipment_rental','equipment','Concrete Equipment Workspace','Mixers, pumps, batching and concrete equipment rental.',array['individual','firm','company'],array['equipment_only','equipment_with_operator','rate_contract'],array['mixer rental','pump rental'],'vendor',array['rentals'],true,false,false,650),
('equipment_service_company','Equipment Repair / Maintenance Provider','equipment_rental','maintenance','Equipment Service Workspace','Construction equipment repair, servicing and field support.',array['individual','workshop','firm','company'],array['direct_service','amc','field_service'],array['machine mechanic'],'vendor',array['services'],true,false,false,660),
('building_material_supplier','Building Material Supplier','materials_supply','procurement','Material Supply Workspace','Supplies construction materials to projects and customers.',array['individual','shop','dealer','distributor','firm','company'],array['retail','wholesale','project_supply','rate_contract'],array['material dealer'],'vendor',array['materials'],true,false,true,700),
('material_manufacturer','Construction Material Manufacturer','materials_supply','manufacturing','Manufacturing Workspace','Manufactures construction materials or building products.',array['proprietorship','partnership','llp','private_limited','public_limited'],array['manufacturing','dealer_network','project_supply'],'{}','vendor',array['materials'],true,false,false,710),
('transport_contractor','Material Transport Contractor','logistics','logistics','Transport Workspace','Transports construction material, machinery or debris.',array['individual','fleet_owner','firm','company'],array['per_trip','rate_contract','dedicated_fleet'],array['truck owner'],'vendor',array['services','rentals'],true,false,false,800),
('property_lawyer','Property / Real Estate Lawyer','legal_compliance','transaction','Legal Workspace','Title, deed, agreement, due diligence and dispute support.',array['individual','law_firm'],array['consultancy','direct_service'],array['advocate'],'vendor',array['services'],true,true,false,850),
('registered_valuer','Registered Valuer','professional','finance','Valuation Workspace','Regulated valuation of land, buildings, plant or machinery.',array['individual','firm'],array['consultancy','inspection'],array['property valuer'],'vendor',array['services'],true,true,false,860),
('home_inspector','Building / Home Inspector','professional','handover','Inspection Workspace','Quality, snagging, condition and handover inspection.',array['individual','firm','company'],array['inspection','consultancy'],array['snag inspector'],'vendor',array['services'],true,false,false,870)
on conflict (identity_key) do nothing;

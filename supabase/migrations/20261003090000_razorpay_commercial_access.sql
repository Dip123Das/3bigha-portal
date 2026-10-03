-- Forward-only website billing. Property purchase advances remain isolated.
begin;
create table public.commercial_catalogue (
  product text primary key, kind text not null, label text not null,
  amount_paise bigint not null check (amount_paise > 0), allowance integer not null,
  version text not null default '2026-10-local-business-v1', enabled boolean not null default true
);
insert into public.commercial_catalogue(product,kind,label,amount_paise,allowance) values
 ('basic_vendor','base','Basic',9900,1),('silver_vendor','base','Silver',19900,1),
 ('gold_vendor','base','Gold',29900,1),('platinum_vendor','base','Platinum',49900,1),
 ('property_5','property_pack','5 extra active properties',9900,5),
 ('property_20','property_pack','20 extra active properties',29900,20),
 ('property_50','property_pack','50 extra active properties',49900,50),
 ('manufacturing','manufacturing','Manufacturing costing · 5 active registers',9900,5),
 ('construction','construction','Construction costing · one project',9900,1);
create table public.commercial_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 product text not null references public.commercial_catalogue(product), resource_id uuid,
 kind text not null, label text not null, amount_paise bigint not null, currency text not null default 'INR' check(currency='INR'),
 allowance integer not null, catalogue_version text not null, idempotency_key uuid not null,
 status text not null default 'created' check(status in('created','checkout_ready','paid','review_required','refunded')),
 gateway_mode text not null check(gateway_mode in('test','live')), gateway_order_id text unique, gateway_payment_id text unique, create_attempt uuid,
 paid_at timestamptz, refunded_paise bigint not null default 0, created_at timestamptz not null default now(),
 unique(user_id,idempotency_key), check(amount_paise > 0 and refunded_paise between 0 and amount_paise)
);
create index commercial_orders_user_created on public.commercial_orders(user_id,created_at desc);
create unique index commercial_orders_one_open_purchase on public.commercial_orders(user_id,kind,coalesce(resource_id,'00000000-0000-0000-0000-000000000000'::uuid)) where status in('created','checkout_ready');
create table public.commercial_entitlements (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 order_id uuid unique references public.commercial_orders(id), product text not null, kind text not null,
 resource_id uuid, allowance integer not null, starts_at timestamptz not null, ends_at timestamptz,
 revoked_at timestamptz, source text not null default 'razorpay', created_at timestamptz not null default now(),
 check(ends_at is null or ends_at > starts_at)
);
create index commercial_entitlements_lookup on public.commercial_entitlements(user_id,kind,resource_id,ends_at);
create table public.commercial_webhook_events(id text primary key,event_type text not null,created_at timestamptz not null default now());
create table public.commercial_refunds(id text primary key,order_id uuid not null references public.commercial_orders(id),refunded_paise bigint not null,created_at timestamptz not null default now());
-- Only enable after deployment checks and merchant settings are complete.
create table public.commercial_controls(id boolean primary key default true check(id),enforcement_enabled boolean not null default false);
insert into public.commercial_controls values(true,false);
alter table public.commercial_catalogue enable row level security;
alter table public.commercial_orders enable row level security;
alter table public.commercial_entitlements enable row level security;
alter table public.commercial_webhook_events enable row level security;
alter table public.commercial_refunds enable row level security;
alter table public.commercial_controls enable row level security;
revoke all on public.commercial_catalogue,public.commercial_orders,public.commercial_entitlements,public.commercial_webhook_events,public.commercial_refunds,public.commercial_controls from anon,authenticated;

-- Preserve trusted existing paid and complimentary access without fabricating revenue.
insert into public.commercial_entitlements(user_id,product,kind,allowance,starts_at,ends_at,source)
 select user_id,case subscription_plan when 'premium_vendor' then 'gold_vendor' when 'hub_vendor' then 'platinum_vendor' else subscription_plan end,'base',1,now(),subscription_expires_at,'legacy_access'
 from public.business_profiles where subscription_status='active' and subscription_plan <> 'free'
 and (subscription_expires_at is null or subscription_expires_at > now());

create function public.commercial_account_ready(p_user uuid) returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
 select exists(select 1 from public.profiles where id=p_user and coalesce(account_status,'active')='active' and approval_status='approved');
$$;
create function public.commercial_has_access(p_user uuid,p_kind text,p_resource uuid default null) returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
 select public.commercial_account_ready(p_user) and exists(select 1 from public.commercial_entitlements where user_id=p_user and kind=p_kind and resource_id is not distinct from p_resource and revoked_at is null and starts_at<=now() and (ends_at is null or ends_at>now()));
$$;

create function public.commercial_operating_capability(p_user uuid,p_capability text) returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
 select exists(select 1 from public.identity_bos_operating_capabilities m join public.bos_operating_capabilities c on c.capability_key=m.capability_key
 where m.capability_key=p_capability and m.is_active and c.is_active and m.identity_key in(
 select jsonb_array_elements_text(coalesce(nullif(to_jsonb(b)->'business_identities','null'::jsonb),'[]'::jsonb)) from public.business_profiles b where b.user_id=p_user
 union select jsonb_array_elements_text(coalesce(nullif(to_jsonb(b)->'individual_identities','null'::jsonb),'[]'::jsonb)) from public.business_profiles b where b.user_id=p_user
 union select primary_skill_key from public.individual_professional_profiles where user_id=p_user));
$$;
create function public.prepare_razorpay_purchase(p_user uuid,p_product text,p_resource uuid,p_key uuid,p_mode text default 'live') returns jsonb language plpgsql security definer set search_path=public,pg_catalog as $$
declare c public.commercial_catalogue%rowtype; o public.commercial_orders%rowtype; existing_product text;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Trusted purchase service required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,91003));
 if not public.commercial_account_ready(p_user) then raise exception 'Complete account approval before purchasing. Existing access is preserved.'; end if;
 if not exists(select 1 from public.business_profiles where user_id=p_user) and not exists(select 1 from public.individual_professional_profiles where user_id=p_user and primary_skill_key is not null) then raise exception 'Complete business or professional registration first.'; end if;
 if p_mode not in('test','live') then raise exception 'Invalid gateway environment.'; end if;
 select * into c from public.commercial_catalogue where product=p_product and enabled;
 if not found then raise exception 'Select a valid service.'; end if;
 if c.kind in('construction','manufacturing') and not public.commercial_operating_capability(p_user,case when c.kind='construction' then 'project_costing' else 'product_costing' end) then raise exception 'This costing service is not enabled for your current business identity.'; end if;
 if c.kind='construction' then
  if not exists(select 1 from public.bos_cost_plans where id=p_resource and user_id=p_user and operating_mode='project' and status not in('completed','archived')) then raise exception 'Select your ongoing project cost register.'; end if;
 elsif p_resource is not null then raise exception 'Unexpected project reference.'; end if;
 if c.kind <> 'base' and not public.commercial_has_access(p_user,'base') then raise exception 'Activate a base business plan before buying an optional service.'; end if;
 -- Switching a live plan/pack would need an agreed credit policy. Renew same tier, or switch after expiry.
 select product into existing_product from public.commercial_entitlements where user_id=p_user and kind=c.kind and resource_id is not distinct from p_resource and revoked_at is null and (ends_at is null or ends_at>now()) order by created_at desc limit 1;
 if existing_product is not null and existing_product<>p_product then raise exception 'Your current plan or pack is still active. Renew it, or switch after expiry.'; end if;
 select * into o from public.commercial_orders where user_id=p_user and idempotency_key=p_key;
 if found then
  if o.product<>p_product or o.resource_id is distinct from p_resource or o.gateway_mode<>p_mode then raise exception 'Purchase reference belongs to a different service.'; end if;
  return to_jsonb(o);
 end if;
 select * into o from public.commercial_orders where user_id=p_user and kind=c.kind and resource_id is not distinct from p_resource and status in('created','checkout_ready');
 if found then
  if o.product<>p_product or o.gateway_mode<>p_mode then raise exception 'A different purchase is pending. Complete or reconcile it before changing your selection.'; end if;
  return to_jsonb(o);
 end if;
 insert into public.commercial_orders(user_id,product,resource_id,kind,label,amount_paise,allowance,catalogue_version,idempotency_key,gateway_mode)
 values(p_user,c.product,p_resource,c.kind,c.label,c.amount_paise,c.allowance,c.version,p_key,p_mode) returning * into o;
 return to_jsonb(o);
end $$;

create function public.finalize_razorpay_purchase(p_order_id uuid,p_payment_id text,p_amount bigint,p_currency text,p_refunded bigint default 0) returns text language plpgsql security definer set search_path=public,pg_catalog as $$
declare o public.commercial_orders%rowtype; expiry timestamptz; start_time timestamptz;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Trusted verification service required.'; end if;
 select * into o from public.commercial_orders where id=p_order_id;
 if not found then raise exception 'Purchase not found.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,91003));
 select * into o from public.commercial_orders where id=p_order_id for update;
 if o.gateway_order_id is null or p_payment_id is null or p_payment_id='' or p_amount<>o.amount_paise or p_currency<>'INR' then raise exception 'Payment mismatch.'; end if;
 if o.gateway_payment_id is not null and o.gateway_payment_id<>p_payment_id then raise exception 'Different payment already recorded.'; end if;
 if p_refunded<0 or p_refunded>o.amount_paise then raise exception 'Invalid provider refund total.'; end if;
 if p_refunded>0 then
  update public.commercial_orders set gateway_payment_id=p_payment_id,paid_at=coalesce(paid_at,now()) where id=o.id;
  perform public.record_razorpay_refund(p_payment_id,'provider-total:'||p_payment_id||':'||p_refunded::text,p_refunded);
  if p_refunded=o.amount_paise then return 'refunded'; end if;
 end if;
 if o.status in('paid','refunded') then return o.status; end if;
 update public.commercial_orders set gateway_payment_id=p_payment_id,paid_at=coalesce(paid_at,now()),status='review_required' where id=o.id;
 if not public.commercial_account_ready(o.user_id) then return 'review_required'; end if;
 if o.kind in('construction','manufacturing') and not public.commercial_operating_capability(o.user_id,case when o.kind='construction' then 'project_costing' else 'product_costing' end) then return 'review_required'; end if;
 if o.kind<>'base' and not public.commercial_has_access(o.user_id,'base') then return 'review_required'; end if;
 if o.kind='construction' and not exists(select 1 from public.bos_cost_plans where id=o.resource_id and user_id=o.user_id and operating_mode='project' and status not in('completed','archived')) then return 'review_required'; end if;
 if exists(select 1 from public.commercial_entitlements where user_id=o.user_id and kind=o.kind and resource_id is not distinct from o.resource_id and revoked_at is null and (ends_at is null or ends_at>now()) and product<>o.product) then return 'review_required'; end if;
 if exists(select 1 from public.commercial_entitlements where user_id=o.user_id and kind=o.kind and resource_id is not distinct from o.resource_id and revoked_at is null and ends_at is null) then return 'review_required'; end if;
 select greatest(now(),coalesce(max(ends_at),now())) into start_time from public.commercial_entitlements where user_id=o.user_id and kind=o.kind and resource_id is not distinct from o.resource_id and revoked_at is null and product=o.product;
 expiry:=start_time+interval '1 month';
 insert into public.commercial_entitlements(user_id,order_id,product,kind,resource_id,allowance,starts_at,ends_at) values(o.user_id,o.id,o.product,o.kind,o.resource_id,o.allowance,start_time,expiry);
 update public.commercial_entitlements set source=case when o.gateway_mode='test' then 'razorpay_test' else 'razorpay' end where order_id=o.id;
 if o.kind='base' then
  perform set_config('app.commercial_finalizer','true',true);
  update public.business_profiles set subscription_plan=o.product,subscription_status='active',subscription_expires_at=expiry,updated_at=now() where user_id=o.user_id;
 end if;
 update public.commercial_orders set status='paid' where id=o.id;
 return 'paid';
end $$;

create function public.record_razorpay_refund(p_payment_id text,p_refund_id text,p_refunded bigint) returns void language plpgsql security definer set search_path=public,pg_catalog as $$
declare o public.commercial_orders%rowtype; e public.commercial_entitlements%rowtype;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Trusted refund service required.'; end if;
 select * into o from public.commercial_orders where gateway_payment_id=p_payment_id;
 if not found then return; end if;
 perform pg_advisory_xact_lock(hashtextextended(o.user_id::text,91003));
 select * into o from public.commercial_orders where id=o.id for update;
 if p_refunded<0 or p_refunded>o.amount_paise then raise exception 'Invalid refund amount.'; end if;
 insert into public.commercial_refunds values(p_refund_id,o.id,p_refunded,now()) on conflict(id) do nothing;
 update public.commercial_orders set refunded_paise=greatest(refunded_paise,p_refunded),status=case when p_refunded=amount_paise then 'refunded' else status end where id=o.id;
 if p_refunded=o.amount_paise then
  update public.commercial_entitlements set revoked_at=now() where order_id=o.id and revoked_at is null;
  if o.kind='base' then
   select * into e from public.commercial_entitlements where user_id=o.user_id and kind='base' and revoked_at is null and starts_at<=now() and (ends_at is null or ends_at>now()) order by ends_at desc nulls first limit 1;
   perform set_config('app.commercial_finalizer','true',true);
   update public.business_profiles set subscription_plan=coalesce(e.product,'free'),subscription_status=case when e.id is null then 'free' else 'active' end,subscription_expires_at=e.ends_at where user_id=o.user_id;
  end if;
 end if;
end $$;

-- Protect subscription projections from direct browser writes, retain master-admin complimentary grants.
create function public.protect_commercial_projection() returns trigger language plpgsql security definer set search_path=public,pg_catalog as $$
begin
 if tg_op='UPDATE' and (new.subscription_plan,new.subscription_status,new.subscription_expires_at) is not distinct from (old.subscription_plan,old.subscription_status,old.subscription_expires_at) then return new; end if;
 if coalesce(auth.role(),'') in('authenticated','anon') then
  if tg_op='INSERT' and coalesce(new.subscription_plan,'free')='free' and coalesce(new.subscription_status,'free')='free' and new.subscription_expires_at is null then return new; end if;
  raise exception 'Subscription access changes only after trusted payment or complimentary approval.';
 end if;
 if coalesce(current_setting('app.commercial_finalizer',true),'')<>'true' then
  update public.commercial_entitlements set revoked_at=now() where user_id=new.user_id and kind='base' and source='complimentary_projection' and revoked_at is null;
  if new.subscription_status='active' and new.subscription_plan<>'free' and (new.subscription_expires_at is null or new.subscription_expires_at>now()) then
   insert into public.commercial_entitlements(user_id,product,kind,allowance,starts_at,ends_at,source) values(new.user_id,new.subscription_plan,'base',1,now(),new.subscription_expires_at,'complimentary_projection');
  end if;
 end if;
 return new;
end $$;
create trigger protect_commercial_projection before insert or update of subscription_plan,subscription_status,subscription_expires_at on public.business_profiles for each row execute function public.protect_commercial_projection();

revoke all on function public.commercial_operating_capability(uuid,text),public.commercial_account_ready(uuid),public.commercial_has_access(uuid,text,uuid),public.prepare_razorpay_purchase(uuid,text,uuid,uuid,text),public.finalize_razorpay_purchase(uuid,text,bigint,text,bigint),public.record_razorpay_refund(text,text,bigint),public.protect_commercial_projection() from public,anon,authenticated;
grant execute on function public.commercial_operating_capability(uuid,text),public.commercial_account_ready(uuid),public.commercial_has_access(uuid,text,uuid),public.prepare_razorpay_purchase(uuid,text,uuid,uuid,text),public.finalize_razorpay_purchase(uuid,text,bigint,text,bigint),public.record_razorpay_refund(text,text,bigint) to service_role;
grant all on public.commercial_catalogue,public.commercial_orders,public.commercial_entitlements,public.commercial_webhook_events,public.commercial_refunds,public.commercial_controls to service_role;
commit;

/* Execute against an isolated PostgreSQL-compatible PGlite instance. No production connection. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { PGlite } = require(process.env.PGLITE_MODULE || "@electric-sql/pglite");
(async () => {
  const db = new PGlite();
  await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
 create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role',true)$$;
 create table auth.users(id uuid primary key);
 create table profiles(id uuid primary key,account_status text,approval_status text);
 create table business_profiles(user_id uuid primary key,business_name text,subscription_plan text,subscription_status text,subscription_expires_at timestamptz,updated_at timestamptz);
 create table bos_cost_plans(id uuid primary key default gen_random_uuid(),user_id uuid,operating_mode text,status text,title text,source_entity_id uuid,source_entity_type text,source_system text,created_at timestamptz default now());
 create table builder_profiles(id uuid primary key,owner_user_id uuid);
 create table builder_projects(id uuid primary key,builder_profile_id uuid,status text,is_active boolean,name text);
 create table builder_inventory_units(id uuid primary key,project_id uuid,status text,trust_status text);
 create table property_listings(id uuid primary key,owner_id uuid,status text);
 create table property_listing_sources(id uuid primary key,property_id uuid,unit_id uuid,source_kind text);
 create table construction_projects(id uuid primary key,user_id uuid,title text,status text);
 create table construction_project_milestones(id uuid primary key,project_id uuid,user_id uuid,status text,actual_start_date date,actual_end_date date,progress_percent integer);
 create table bos_cost_entries(id uuid primary key,plan_id uuid,amount numeric);
 create table bos_cost_outputs(id uuid primary key,plan_id uuid);
 create table bos_cost_stock_consumption_intents(id uuid primary key,plan_id uuid);
 create table identity_bos_operating_capabilities(identity_key text,capability_key text,is_active boolean);
 create table bos_operating_capabilities(capability_key text,is_active boolean);
 create table individual_professional_profiles(user_id uuid,primary_skill_key text);
 insert into identity_bos_operating_capabilities values('maker','product_costing',true),('maker','project_costing',true);
 insert into bos_operating_capabilities values('product_costing',true),('project_costing',true);
 select set_config('request.jwt.claim.role','service_role',false);`);
  for (const f of [
    "20261003090000_razorpay_commercial_access.sql",
    "20261003091000_commercial_allowance_enforcement.sql",
    "20261003092000_cost_project_billing_link.sql",
  ])
    await db.exec(fs.readFileSync("supabase/migrations/" + f, "utf8"));
  const user = "11111111-1111-4111-8111-111111111111";
  const project = "22222222-2222-4222-8222-222222222222";
  await db.exec(
    `insert into auth.users values('${user}');insert into profiles values('${user}','active','approved');insert into business_profiles values('${user}','Vendor','free','free',null,now());`,
  );
  async function query(q, p = []) {
    return (await db.query(q, p)).rows;
  }
  async function fails(q, p, pattern) {
    await assert.rejects(() => query(q, p), pattern);
  }
  const prepare = async (product, resource = null) => {
    const rows = await query(
      "select prepare_razorpay_purchase($1,$2,$3,gen_random_uuid()) o",
      [user, product, resource],
    );
    return rows[0].o;
  };
  await query(
    "insert into individual_professional_profiles values($1,'maker')",
    [user],
  );
  let o = await prepare("basic_vendor");
  assert.equal(o.amount_paise, 9900);
  const repeated = await prepare("basic_vendor");
  assert.equal(repeated.id, o.id, "one open purchase");
  await fails(
    "select prepare_razorpay_purchase($1,$2,null,gen_random_uuid())",
    [user, "platinum_vendor"],
    /different purchase/,
  );
  assert.equal(
    (await query("select subscription_status from business_profiles"))[0]
      .subscription_status,
    "free",
    "purchase intent preserves access",
  );
  await query(
    "update commercial_orders set gateway_order_id='order_test' where id=$1",
    [o.id],
  );
  await fails(
    "select finalize_razorpay_purchase($1,$2,$3,$4)",
    [o.id, "pay_test", 49900, "INR"],
    /mismatch/,
  );
  await query("select finalize_razorpay_purchase($1,$2,$3,$4)", [
    o.id,
    "pay_test",
    9900,
    "INR",
  ]);
  const expiry = (
    await query("select subscription_expires_at from business_profiles")
  )[0].subscription_expires_at;
  await query("select finalize_razorpay_purchase($1,$2,$3,$4)", [
    o.id,
    "pay_test",
    9900,
    "INR",
  ]);
  assert.equal(
    (
      await query(
        "select count(*)::int n from commercial_entitlements where order_id=$1",
        [o.id],
      )
    )[0].n,
    1,
    "capture idempotency",
  );
  assert.equal(
    String(
      (await query("select subscription_expires_at from business_profiles"))[0]
        .subscription_expires_at,
    ),
    String(expiry),
  );
  await db.exec(
    "select set_config('request.jwt.claim.role','authenticated',false)",
  );
  await fails(
    "update business_profiles set subscription_plan='platinum_vendor'",
    [],
    /trusted payment/,
  );
  await fails(
    "select finalize_razorpay_purchase($1,$2,$3,$4)",
    [o.id, "pay_test", 9900, "INR"],
    /Trusted verification/,
  );
  await db.exec(
    "select set_config('request.jwt.claim.role','service_role',false);update commercial_controls set enforcement_enabled=true;",
  );
  await query(
    "insert into property_listings values(gen_random_uuid(),$1,'active')",
    [user],
  );
  await fails(
    "insert into property_listings values(gen_random_uuid(),$1,'active')",
    [user],
    /capacity reached/,
  );
  await query(
    "insert into property_listings values(gen_random_uuid(),$1,'draft')",
    [user],
  );
  // One builder unit and its public listing consume one capacity item.
  await query("update property_listings set status='draft' where owner_id=$1", [
    user,
  ]);
  const bp = "44444444-4444-4444-8444-444444444444",
    building = "55555555-5555-4555-8555-555555555555",
    unit = "66666666-6666-4666-8666-666666666666",
    listing = "77777777-7777-4777-8777-777777777777",
    source = "88888888-8888-4888-8888-888888888888";
  await query("insert into builder_profiles values($1,$2)", [bp, user]);
  await query(
    "insert into builder_projects values($1,$2,'active',true,'Builder')",
    [building, bp],
  );
  await query(
    "insert into builder_inventory_units values($1,$2,'available','verified')",
    [unit, building],
  );
  await query("insert into property_listings values($1,$2,'draft')", [
    listing,
    user,
  ]);
  await query(
    "insert into property_listing_sources values($1,$2,$3,'builder_inventory')",
    [source, listing, unit],
  );
  await query("update property_listings set status='active' where id=$1", [
    listing,
  ]);
  assert.equal(
    (await query("select commercial_property_usage($1) n", [user]))[0].n,
    1,
  );
  await fails(
    "delete from property_listing_sources where id=$1",
    [source],
    /capacity reached/,
  );
  await query("update builder_inventory_units set status='sold' where id=$1", [
    unit,
  ]);
  assert.equal(
    (await query("select commercial_property_usage($1) n", [user]))[0].n,
    0,
    "sold unit frees capacity",
  );
  await query(
    "insert into bos_cost_plans(id,user_id,operating_mode,status,title,source_entity_id) values($1,$2,'project','draft','Building',null)",
    [project, user],
  );
  await fails(
    "insert into bos_cost_entries values(gen_random_uuid(),$1,20)",
    [project],
    /Activate this register/,
  );
  let construction = await prepare("construction", project);
  await query(
    "update commercial_orders set gateway_order_id='order_construction' where id=$1",
    [construction.id],
  );
  await query("select finalize_razorpay_purchase($1,$2,$3,$4)", [
    construction.id,
    "pay_construction",
    9900,
    "INR",
  ]);
  await query("update bos_cost_plans set status='active' where id=$1", [
    project,
  ]);
  await query("insert into bos_cost_entries values(gen_random_uuid(),$1,20)", [
    project,
  ]);
  await query(
    "update commercial_entitlements set ends_at=now()-interval '1 second', starts_at=now()-interval '2 month' where order_id=$1",
    [construction.id],
  );
  await fails(
    "insert into bos_cost_entries values(gen_random_uuid(),$1,30)",
    [project],
    /Activate construction/,
  );
  await query("update bos_cost_plans set status='archived' where id=$1", [
    project,
  ]);
  let manufacture = await prepare("manufacturing");
  await query(
    "update commercial_orders set gateway_order_id='order_m' where id=$1",
    [manufacture.id],
  );
  await query("select finalize_razorpay_purchase($1,$2,$3,$4)", [
    manufacture.id,
    "pay_m",
    9900,
    "INR",
  ]);
  for (let i = 0; i < 5; i++)
    await query(
      "insert into bos_cost_plans(id,user_id,operating_mode,status,title,source_entity_id) values(gen_random_uuid(),$1,'product','active','Product',null)",
      [user],
    );
  await fails(
    "insert into bos_cost_plans(id,user_id,operating_mode,status,title,source_entity_id) values(gen_random_uuid(),$1,'product','active','Sixth',null)",
    [user],
    /allowance reached/,
  );
  let blocked = await prepare("basic_vendor");
  await query(
    "update commercial_orders set gateway_order_id='order_blocked' where id=$1",
    [blocked.id],
  );
  await db.exec("update profiles set account_status='suspended'");
  assert.equal(
    (
      await query("select finalize_razorpay_purchase($1,$2,$3,$4) s", [
        blocked.id,
        "pay_blocked",
        9900,
        "INR",
      ])
    )[0].s,
    "review_required",
  );
  assert.equal(
    (await query("select approval_status from profiles"))[0].approval_status,
    "approved",
    "payment never changes identity approval",
  );
  await db.exec("update profiles set account_status='active'");
  await query("select record_razorpay_refund($1,$2,$3)", [
    "pay_m",
    "rfnd_m",
    9900,
  ]);
  assert.equal(
    (
      await query("select status from commercial_orders where id=$1", [
        manufacture.id,
      ])
    )[0].status,
    "refunded",
  );
  assert.equal(
    (
      await query("select commercial_has_access($1,'manufacturing') a", [user])
    )[0].a,
    false,
    "refund revokes purchased access",
  );
  // Refund-before-capture must record the receipt without creating paid access.
  let earlyRefund = await prepare("manufacturing");
  await query(
    "update commercial_orders set gateway_order_id='order_early_refund' where id=$1",
    [earlyRefund.id],
  );
  assert.equal(
    (
      await query("select finalize_razorpay_purchase($1,$2,$3,$4,$5) s", [
        earlyRefund.id,
        "pay_early_refund",
        9900,
        "INR",
        9900,
      ])
    )[0].s,
    "refunded",
  );
  assert.equal(
    (
      await query(
        "select count(*)::int n from commercial_entitlements where order_id=$1",
        [earlyRefund.id],
      )
    )[0].n,
    0,
  );
  // Link the same turnkey project twice: same register, one service.
  const linkedProject = "33333333-3333-4333-8333-333333333333";
  await query(
    "insert into construction_projects values($1,$2,'Turnkey building','planning')",
    [linkedProject, user],
  );
  const binding = (
    await query(
      "select link_commercial_project_register($1,$2,'construction_project') id",
      [user, linkedProject],
    )
  )[0].id;
  assert.equal(
    (
      await query(
        "select link_commercial_project_register($1,$2,'construction_project') id",
        [user, linkedProject],
      )
    )[0].id,
    binding,
  );
  await fails(
    "update construction_projects set status='execution' where id=$1",
    [linkedProject],
    /Activate this project/,
  );
  await fails(
    "insert into construction_project_milestones values(gen_random_uuid(),$1,$2,'in_progress',null,null,30)",
    [linkedProject, user],
    /Activate this project/,
  );
  let linkedOrder = await prepare("construction", binding);
  await query(
    "update commercial_orders set gateway_order_id='order_linked' where id=$1",
    [linkedOrder.id],
  );
  await query("select finalize_razorpay_purchase($1,$2,$3,$4)", [
    linkedOrder.id,
    "pay_linked",
    9900,
    "INR",
  ]);
  await query(
    "update construction_projects set status='execution' where id=$1",
    [linkedProject],
  );
  await query(
    "update construction_projects set status='completed' where id=$1",
    [linkedProject],
  );
  assert.equal(
    (await query("select status from bos_cost_plans where id=$1", [binding]))[0]
      .status,
    "completed",
  );
  const all = await query(
    "select product,amount_paise from commercial_catalogue",
  );
  assert.equal(all.length, 9);
  console.log(
    "PASS: catalogue, idempotency, access preservation, forged projection rejection, capture mismatch, restricted accounts, property capacity, costing expiry, manufacturing quota, refunds",
  );
  await db.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

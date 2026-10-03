const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { createHmac } = require("node:crypto");
function load(file, mocks = {}) {
  const full = path.resolve(file);
  const m = new Module(full, module);
  m.filename = full;
  m.paths = Module._nodeModulePaths(path.dirname(full));
  const original = m.require.bind(m);
  m.require = (name) => (name in mocks ? mocks[name] : original(name));
  m._compile(
    ts.transpileModule(fs.readFileSync(full, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    full,
  );
  return m.exports;
}
const catalogue = load("lib/payments/catalogue.ts");
const gateway = load("lib/payments/razorpay.ts");
const matching = load("lib/marketplace/intelligence/vendor-core.ts");
assert.deepEqual(
  Object.values(catalogue.SUBSCRIPTION_PLANS).map((p) => p.amountPaise),
  [9900, 19900, 29900, 49900],
);
assert.equal(Object.keys(catalogue.COMMERCIAL_PRODUCTS).length, 9);
assert.equal(catalogue.isPaidSubscriptionPlan("toString"), false);
const sql = fs.readFileSync(
  "supabase/migrations/20261003090000_razorpay_commercial_access.sql",
  "utf8",
);
for (const [product, p] of Object.entries(catalogue.COMMERCIAL_PRODUCTS)) {
  assert.match(
    sql,
    new RegExp(
      `'${product}','${p.kind}','[^']*',${p.amountPaise},${p.allowance}`,
    ),
  );
}
const secret = "isolated-test-secret";
const message = "order_123|pay_456";
const signature = createHmac("sha256", secret).update(message).digest("hex");
assert.equal(gateway.validSignature(message, signature, secret), true);
assert.equal(
  gateway.validSignature("order_other|pay_456", signature, secret),
  false,
);
assert.equal(gateway.validSignature(message, "bad", secret), false);
const raw = '{"event":"payment.captured", "id":1}';
assert.equal(
  gateway.validSignature(
    JSON.stringify(JSON.parse(raw)),
    createHmac("sha256", secret).update(raw).digest("hex"),
    secret,
  ),
  false,
  "raw body required",
);
const order = { gateway_order_id: "order_123", amount_paise: 9900 };
const payment = {
  order_id: "order_123",
  amount: 9900,
  currency: "INR",
  status: "captured",
  id: "pay_456",
};
assert.equal(gateway.matchesCapturedPayment(payment, order), true);
for (const override of [
  { amount: 1 },
  { order_id: "order_other" },
  { currency: "USD" },
  { status: "authorized" },
  { status: "refunded", amount_refunded: 1 },
])
  assert.equal(
    gateway.matchesCapturedPayment({ ...payment, ...override }, order),
    false,
  );
assert.equal(
  gateway.matchesCapturedPayment(
    { ...payment, status: "refunded", amount_refunded: 9900 },
    order,
  ),
  true,
  "fully refunded evidence is reconciled without a grant",
);
for (const [plan, points] of [
  ["basic_vendor", 3],
  ["silver_vendor", 5],
  ["gold_vendor", 10],
  ["platinum_vendor", 20],
  ["premium_vendor", 10],
  ["hub_vendor", 20],
]) {
  assert.equal(
    matching.getPlanBoost({
      subscription_plan: plan,
      subscription_status: "active",
      subscription_expires_at: "2099-01-01",
    }),
    points,
  );
  assert.equal(
    matching.getPlanBoost({
      subscription_plan: plan,
      subscription_status: "payment_pending",
    }),
    0,
  );
  assert.equal(
    matching.getPlanBoost({
      subscription_plan: plan,
      subscription_status: "active",
      subscription_expires_at: "2020-01-01",
    }),
    0,
  );
}
(async () => {
  const NextResponse = {
    json: (body, opts = {}) => ({ status: opts.status || 200, body }),
  };
  let user = null;
  let storedOrder = null;
  let reconciled = 0;
  const chain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return { data: storedOrder, error: null };
    },
  };
  const verify = load("app/api/payments/razorpay/verify/route.ts", {
    "next/server": { NextResponse },
    "@/lib/payments/server": {
      paymentUser: async () => user,
      reconcilePayment: async () => {
        reconciled++;
        return "paid";
      },
    },
    "@/lib/supabaseAdmin": { getSupabaseAdmin: () => ({ from: () => chain }) },
    "@/lib/payments/razorpay": gateway,
  });
  const req = (body) => ({ json: async () => body });
  const response = {
    razorpay_order_id: "order_123",
    razorpay_payment_id: "pay_456",
    razorpay_signature: signature,
  };
  process.env.RAZORPAY_KEY_SECRET = secret;
  assert.equal((await verify.POST(req(response))).status, 401);
  user = { id: "member" };
  assert.equal((await verify.POST(req(response))).status, 404);
  storedOrder = { ...order };
  assert.equal(
    (await verify.POST(req({ ...response, razorpay_signature: "invalid" })))
      .status,
    400,
  );
  assert.equal(reconciled, 0);
  assert.equal((await verify.POST(req(response))).status, 200);
  assert.equal(reconciled, 1);
  console.log(
    "PASS: catalogue parity, signatures/raw webhook body, payment matching, all segment plan weights/expiry, authenticated callback verification",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

# Razorpay and local-business pricing rollout

Scope: website subscription purchases and optional property/manufacturing/construction services. Rentals, professional/legal/turnkey services, materials and property use one business subscription. Property purchase advances remain on their existing isolated readiness contract and cannot be activated by these subscription payments.

## Delivered behaviour

- Base totals: ₹99 Basic, ₹199 Silver, ₹299 Gold, ₹499 Platinum per calendar month, inclusive of applicable tax; no extra checkout gateway surcharge.
- Base plans include one property. Packs provide 5/20/50 additional active slots for ₹99/₹299/₹499 per month. One active pack per account, across projects. Independently marketed units and their linked listings count once; drafts, sold and archived units do not consume capacity.
- Manufacturing costing: ₹99/business/month for five active product/batch registers. Existing inventory workflows, finished-output handoff, purchases, stock consumption and marketplace entry remain connected.
- Construction/turnkey costing: ₹99/project/month. An existing builder or construction project links to one canonical cost register. Its execution and register use that register's one entitlement. Existing basic estimation and planning remain free.
- Old complimentary and paid access is preserved in a non-revenue ledger. New unpaid orders do not alter it. Trusted complimentary admin grants remain supported. Direct authenticated writes cannot forge subscription activation.
- Calendar-month renewal is manual and preserves remaining time. Switching a still-active base plan or property pack is deliberately refused pending an agreed credit/proration policy; switch after expiry. Purchases do not create recurring mandates or automatic debits.
- Account approval and operating-identity capabilities remain independent of payment. A later account restriction, lost capability or completed project records the captured receipt for review rather than granting inappropriate access. Members can recheck owned paid orders after approval without paying again.
- Captured receipts, refund totals, pending attempts and durable grants are visible in member/admin screens. Test receipts are labelled and excluded from live receipt totals. Captured receipts are not represented as bank settlements or tax-exclusive revenue. No GST invoice or bank-settlement reconciliation is fabricated; use the merchant's configured accounting process for both.
- Full refunds revoke that purchase. Partial refunds record cumulative provider-confirmed totals and retain the remaining purchased access. Refund-before-capture event delivery never grants a fully refunded service.

## Migrations, in order

1. `supabase/migrations/20261003090000_razorpay_commercial_access.sql`
2. `supabase/migrations/20261003091000_commercial_allowance_enforcement.sql`
3. `supabase/migrations/20261003092000_cost_project_billing_link.sql`

Apply through the project's normal controlled migration process. These are forward migrations, not edits to historical SBI data. Back up production and compare its deployed revision/schema with the tested branch before applying. They require existing profiles/business profiles, Identity Master operating-capability tables, BOS cost tables, builder/property/source tables, and construction-project/milestone tables. The isolated tests use explicit minimal fixtures; they do not certify the entire deployed schema.

`commercial_controls.enforcement_enabled` starts false. Both test payments and live rollout should be verified in an isolated staging database. The migration gives existing property capacity and active costing registers 30 days of transition access from migration time. It creates no cash receipt for that access. Communicate the expiry before enforcement; do not apply months in advance. Old paid/complimentary base access preserves its actual existing expiry, including no expiry where recorded.

The catalogue is mirrored into the server-owned database table so RPCs price every order. The parity test verifies exact price/allowance matches with the shared TypeScript catalogue. All customer totals are shown before Checkout. Unbounded expensive AI, message and media usage is not newly promised.

## Server-only environment

Set privately in the server environment, never in chat, git or a `NEXT_PUBLIC_` variable:

- `RAZORPAY_ENABLED=false` initially; set true only for the verified environment.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: matching test or live keys from the merchant dashboard.
- `RAZORPAY_WEBHOOK_SECRET`: a separate strong secret matching the webhook setup.
- Staging only: `RAZORPAY_TEST_PAYMENTS_ENABLED=true`, test keys and a separate staging database. Leave false/absent on production.
- Live only: `RAZORPAY_LIVE_TAX_CONFIRMED=true` after confirming the tax-inclusive totals and invoicing arrangement for the merchant. The flag records operator readiness; it does not calculate a tax rate or establish a legal tax classification.
- Existing Supabase server URL, public client configuration and service-role key must already be configured. Keep service-role and Razorpay secrets server-only.

The implementation uses key prefixes to label the mode, and fetches evidence with the configured merchant keys. Do not share the production database with a test deployment: test grants exist only to exercise the staging lifecycle. Retain old webhook secrets during provider retries when rotating configuration; coordinate a rotation rather than dropping pending events.

## Merchant dashboard

Configure a public HTTPS webhook at `/api/payments/razorpay/webhook` on the matching staging/live host. Subscribe to `payment.captured`, `order.paid`, and `refund.processed`. Verify the raw-body signature and provider capture evidence before activation. No `payment.authorized` event activates access. Test duplicate/out-of-order webhooks and callback delivery.

A lost provider-order creation response remains locked for reconciliation rather than blindly creating another payable order. Find the purchase UUID in the admin revenue screen and locate its Razorpay order using that UUID as the merchant receipt reference. Use the admin reconciliation form to attach the existing order: the backend checks receipt UUID, amount, currency and any previous order binding against the merchant API. It creates no new charge. Do not clear creation claims without first checking for an existing merchant order.

Member history can recheck checkout-ready and captured-review orders using provider evidence when the browser callback was lost. No client-declared success, amount or receipt can grant access.

## Verification

```bash
npm ci
node scripts/payments/verify-commercial-core.cjs
node scripts/payments/verify-commercial-sql.cjs
npx tsc --noEmit --incremental false
npm run build
```

`verify-commercial-sql.cjs` runs against isolated PostgreSQL-compatible PGlite and contains no production connection. It verifies payment mismatch rejection, duplicate finalization, preservation of unpaid access, protected projections, restricted accounts, property capacity and deduplication, costing expiry, manufacturing quota, refund-before-capture, canonical project linkage and project execution gating. Real multi-session PostgreSQL concurrency and end-to-end merchant checkout still need staging verification, despite the database advisory-lock design.

The implementation workspace lacks the existing Supabase environment. Its build compiled and passed Next's type check, but page-data collection fails in existing eagerly configured Supabase routes (`supabaseUrl is required`). The complete production build must therefore pass in the configured deployment environment before rollout. No real merchant payment or live webhook was exercised here.

After configured staging checks pass, enable database enforcement through the trusted migration/admin operator:

```sql
update public.commercial_controls set enforcement_enabled = true where id = true;
```

Live order creation refuses to proceed without this flag. Deploy the reviewed code and configured environment, restart the existing PM2 service through the normal deployment process, and verify the catalogue/readiness/member/admin paths. Verify one authorized live payment and refund in the merchant account before inviting vendors to pay. Do not infer bank settlement from capture.

## Operational limits and preservation

- Existing over-capacity publications are not silently deleted/unpublished. Enforcement blocks additional publication and protects history; owners can reduce capacity, archive units or buy a pack. An automatic expiry visibility scheduler and user-selected listing retention workflow are not added by this change. Be clear about this retention policy before launch.
- Costing expiry leaves reads and existing export workflows available; ongoing cost writes and live project-execution updates are denied. A user can complete/archive a register to free a manufacturing slot. New registers are drafts; purchase the service and activate before entering costs.
- Costing table triggers cover plans, lines, entries, outputs, revisions, cost centres, handoffs, stock-consumption intents and custom entry values. Existing stock-issue functions run in their database transaction, so a rejected paid cost entry rolls back associated mutations. General stock/inventory usage is not converted into a compulsory costing purchase.
- New standalone paid boosts are not sold. Existing legacy boost records are retained. Plan matching now recognizes canonical Basic/Silver/Gold/Platinum keys and expiry for the touched RFQ/nearby recommendation paths. Payment does not create verification badges or guarantee enquiries/sales.
- This is a reviewable implementation branch. It does not deploy itself, migrate a live database, configure merchant credentials or alter Google Play billing.

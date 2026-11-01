import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const authority = read(
  "lib/mobile/server/property-booking-advance.ts",
);
const client = read(
  "apps/mobile/src/features/property/booking-advance-api.ts",
);
const screen = read(
  "apps/mobile/src/features/property/PropertyBookingAdvanceScreen.tsx",
);
const packageJson = read("apps/mobile/package.json");

const withdrawnDrafts = [
  "supabase/migrations/20260923100000_mob_35_property_booking_advance_gateway_attempts.sql",
  "supabase/migrations/20260923103000_mob_35_property_booking_advance_gateway_preparation.sql",
  "supabase/migrations/20260923110000_mob_35_property_booking_advance_order_request.sql",
  "supabase/migrations/20260923113000_mob_35_property_booking_advance_order_created.sql",
  "supabase/migrations/20260923120000_mob_35_property_booking_advance_callback_reconciliation.sql",
];

for (const path of withdrawnDrafts) {
  assert.equal(
    fs.existsSync(path),
    false,
    `Withdrawn provider-specific MOB-35 draft must remain absent: ${path}`,
  );
}

assert.match(authority, /canCreateGatewayOrder:[\s\S]*?actor === "buyer"/);
assert.match(authority, /gatewayReady/);
assert.match(authority, /createsGatewayOrder: true/);
assert.match(authority, /collectsMoney: true/);
assert.match(authority, /sellerDirectPayment: true/);
assert.match(authority, /buyerFullRefundOnCancellation: true/);
assert.match(authority, /sellerSettlementHeldUntilDealCompletion: true/);
assert.doesNotMatch(
  client,
  /RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|gatewaySecret|merchantSecret|verifyGatewaySignature\s*\(/i,
);
assert.match(packageJson, /"react-native-razorpay": "3\.0\.0"/);
assert.match(screen, /RazorpayCheckout\.open/);
assert.match(screen, /createPropertyBookingAdvanceOrder/);
assert.match(screen, /verifyPropertyBookingAdvancePayment/);
assert.match(screen, /requestPropertyBookingAdvanceRefund/);
assert.match(screen, /confirmPropertyBookingDealCompletion/);
assert.doesNotMatch(
  screen,
  /WebBrowser|Linking\.openURL|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET/,
);

console.log(
  "MOB-35 provider-specific draft withdrawal and Razorpay Route native-checkout assertions passed.",
);

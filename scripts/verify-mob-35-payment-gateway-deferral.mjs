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

for (const source of [authority, client]) {
  assert.match(source, /createsGatewayOrder: false/);
  assert.match(source, /collectsMoney: false/);
  assert.doesNotMatch(
    source,
    /createPayment\s*\(|capturePayment\s*\(|executePayment\s*\(|createGatewayOrder\s*\(|verifyGatewaySignature\s*\(|gatewaySecret|merchantSecret/i,
  );
}

assert.match(screen, /gateway-order creation remains disabled/i);
assert.doesNotMatch(
  screen,
  /WebBrowser|Linking\.openURL|createPayment\s*\(|capturePayment\s*\(|createGatewayOrder\s*\(/,
);

console.log(
  "MOB-35 postponed payment-gateway execution and provider-draft withdrawal assertions passed.",
);

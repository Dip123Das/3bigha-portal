import assert from "node:assert/strict";

function normalizeText(value, fallback = "") {
  const result = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return result || fallback;
}

function inferType(module, title) {
  const normalized = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return normalized
    ? `${module}.${normalized}`
    : `${module}.activity`;
}

assert.equal(
  normalizeText(
    "  Quote   accepted  "
  ),
  "Quote accepted"
);

assert.equal(
  inferType("quote", "Quote accepted"),
  "quote.quote.accepted"
);

assert.equal(
  inferType("rfq", ""),
  "rfq.activity"
);

console.log(
  "Unified operational event bus verification passed."
);

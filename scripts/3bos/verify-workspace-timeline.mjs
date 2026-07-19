import assert from "node:assert/strict";

const SUCCESS_WORDS = [
  "accepted",
  "approved",
  "completed",
  "closed",
  "delivered",
  "paid",
  "published",
  "resolved",
  "success",
];

const ATTENTION_WORDS = [
  "awaiting",
  "due",
  "new",
  "open",
  "pending",
  "received",
  "reply",
  "required",
  "urgent",
];

function resolveTone(text) {
  const value = String(text).toLowerCase();

  if (
    SUCCESS_WORDS.some((word) =>
      value.includes(word)
    )
  ) {
    return "success";
  }

  if (
    ATTENTION_WORDS.some((word) =>
      value.includes(word)
    )
  ) {
    return "attention";
  }

  return "neutral";
}

assert.equal(
  resolveTone("Quote accepted"),
  "success"
);

assert.equal(
  resolveTone("New RFQ received"),
  "attention"
);

assert.equal(
  resolveTone("Workspace activity"),
  "neutral"
);

console.log(
  "Workspace timeline intelligence verification passed."
);

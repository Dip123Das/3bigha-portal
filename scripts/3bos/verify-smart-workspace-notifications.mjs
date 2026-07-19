import assert from "node:assert/strict";

const rules = [
  {
    input: "Payment failed",
    expected: "warning",
  },
  {
    input: "Quote received",
    expected: "awaiting_response",
  },
  {
    input: "Approval required",
    expected: "action_required",
  },
  {
    input: "Delivery completed",
    expected: "success",
  },
  {
    input: "RFQ created",
    expected: "information",
  },
];

function classify(title) {
  const text =
    String(title).toLowerCase();

  if (
    [
      "failed",
      "rejected",
      "overdue",
      "blocked",
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "warning";
  }

  if (
    [
      "quote received",
      "message received",
      "vendor replied",
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "awaiting_response";
  }

  if (
    [
      "approval required",
      "action required",
      "review required",
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "action_required";
  }

  if (
    [
      "completed",
      "accepted",
      "approved",
      "delivered",
      "paid",
    ].some((word) =>
      text.includes(word)
    )
  ) {
    return "success";
  }

  return "information";
}

for (const rule of rules) {
  assert.equal(
    classify(rule.input),
    rule.expected,
    `${rule.input} was classified incorrectly.`
  );
}

console.log(
  "Smart workspace notification verification passed."
);

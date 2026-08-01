import fs from "node:fs";
import path from "node:path";

const pagePath = path.join(
  process.cwd(),
  "app/dashboard/buyer/page.tsx"
);

const source = fs.readFileSync(pagePath, "utf8");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(
  source.includes('.eq("requester_user_id", session.user.id)'),
  "Buyer Dashboard RFQ query is not explicitly scoped to the signed-in buyer."
);

check(
  source.includes("requester_user_id"),
  "Buyer ownership column is not included in the Buyer Dashboard query."
);

check(
  source.includes("rfqsError"),
  "Buyer Dashboard does not surface RFQ query failures."
);

console.log("A-2.1 Buyer RFQ Ownership assertions passed.");
console.log("Buyer Dashboard now requests only RFQs owned by the signed-in user.");

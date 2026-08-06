import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const pagePath = path.join(
  root,
  "app/admin/individual-professional-reviews/page.tsx"
);

const actionsPath = path.join(
  root,
  "app/admin/individual-professional-reviews/IndividualProfessionalReviewActions.tsx"
);

if (!fs.existsSync(pagePath)) {
  throw new Error(
    "Skilled professional admin review page is missing."
  );
}

if (!fs.existsSync(actionsPath)) {
  throw new Error(
    "Skilled professional review actions are missing."
  );
}

const page = fs.readFileSync(pagePath, "utf8");
const actions = fs.readFileSync(actionsPath, "utf8");

const adminDashboard = fs.readFileSync(
  path.join(
    root,
    "app/admin/dashboard/page.tsx"
  ),
  "utf8"
);

for (const marker of [
  "requireMasterAdmin",
  "Skilled Professional Reviews",
  "verified_selfie_json",
  "work_photo_one_json",
  "work_photo_two_json",
  "ai_result_json",
  "individual_professional_review_history",
  "Immutable audit history",
  "IndividualProfessionalReviewActions",
  "AI is advisory only",
]) {
  if (!page.includes(marker)) {
    throw new Error(
      `Admin review page marker missing: ${marker}`
    );
  }
}

for (const marker of [
  "/api/admin/individual-professional-review",
  "Approve Lifetime-Free",
  "Request Correction",
  "Reject Misuse",
  "Reclassify as Business",
  "confirmationAccepted",
  "authorised human decision",
  "approvalFailures",
]) {
  if (!actions.includes(marker)) {
    throw new Error(
      `Admin review action marker missing: ${marker}`
    );
  }
}

if (
  actions.includes(
    '.from("individual_professional_profiles")'
  )
) {
  throw new Error(
    "The browser review actions must not update professional profiles directly."
  );
}

for (const marker of [
  "Admin · Skilled Professional Reviews",
  "/admin/individual-professional-reviews",
  "live selfie",
  "work evidence",
  "human approval",
  "lifetime free",
]) {
  if (!adminDashboard.includes(marker)) {
    throw new Error(
      `Admin Dashboard review-card marker missing: ${marker}`
    );
  }
}

console.log(
  "BI-4 individual professional admin-workspace assertions passed."
);

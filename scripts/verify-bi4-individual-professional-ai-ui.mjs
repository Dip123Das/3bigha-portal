import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const client = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalOnboardingClient.tsx"
  ),
  "utf8"
);

const panel = fs.readFileSync(
  path.join(
    root,
    "app/onboarding/individual-professional/IndividualProfessionalAiReviewPanel.tsx"
  ),
  "utf8"
);

const clientMarkers = [
  "checkWorkEvidence",
  "/api/ai/individual-professional-verify",
  "IndividualProfessionalAiReviewPanel",
  "aiVerificationStatus",
  "lifetimeFreeDecisionStatus",
  "aiResultAllowsSubmission",
  'aiVerificationStatus !== "likely_unrelated"',
];

for (const marker of clientMarkers) {
  if (!client.includes(marker)) {
    throw new Error(
      `Individual professional AI UI client marker missing: ${marker}`
    );
  }
}

const panelMarkers = [
  "Check My Work Evidence",
  "Review confidence",
  "First work photo",
  "Second work photo",
  "Skill relevance",
  "Lifetime-free decision",
  "Final approval remains with an authorised human reviewer",
];

for (const marker of panelMarkers) {
  if (!panel.includes(marker)) {
    throw new Error(
      `Individual professional AI review panel marker missing: ${marker}`
    );
  }
}

if (
  panel.includes(
    "Lifetime-free registration approved"
  )
) {
  throw new Error(
    "The AI UI must not claim that AI approved lifetime-free registration."
  );
}

console.log(
  "BI-4 individual professional AI-UI assertions passed."
);

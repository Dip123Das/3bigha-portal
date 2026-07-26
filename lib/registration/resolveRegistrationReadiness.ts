export type BusinessProofStatus =
  | "not_uploaded"
  | "ready_to_verify"
  | "verifying"
  | "under_review"
  | "needs_correction"
  | "verified";

export type RegistrationReadinessInput = {
  identityReady: boolean;
  addressReady: boolean;
  aboutReady: boolean;
  coverageReady: boolean;

  legalProofReady: boolean;
  practicalProofReady: boolean;
  liveSelfieReady: boolean;

  businessProofStatus: BusinessProofStatus;
  declarationsAccepted?: boolean;
  dashboardActivated?: boolean;
};

export type RegistrationReadinessStepKey =
  | "identity"
  | "address"
  | "about"
  | "coverage"
  | "legal-proof"
  | "practical-proof"
  | "live-selfie"
  | "business-proof"
  | "declarations";

export type RegistrationReadinessStep = {
  key: RegistrationReadinessStepKey;
  label: string;
  complete: boolean;
};

export type RegistrationReadiness = {
  identityReady: boolean;
  addressReady: boolean;
  aboutReady: boolean;
  coverageReady: boolean;

  legalProofReady: boolean;
  practicalProofReady: boolean;
  liveSelfieReady: boolean;

  evidenceCollectionComplete: boolean;
  evidenceCollectionProgress: number;

  businessProofStatus: BusinessProofStatus;
  businessProofReady: boolean;
  businessProofStatusLabel: string;

  declarationsAccepted: boolean;
  registrationReady: boolean;
  activationAllowed: boolean;
  dashboardActivated: boolean;

  completedRequiredSteps: number;
  requiredStepCount: number;
  progressPercent: number;

  steps: RegistrationReadinessStep[];
  pendingSteps: RegistrationReadinessStep[];
  nextRequiredStep: RegistrationReadinessStep | null;
};

const BUSINESS_PROOF_STATUS_LABELS: Record<
  BusinessProofStatus,
  string
> = {
  not_uploaded: "Upload one valid legal business proof",
  ready_to_verify:
    "Evidence uploaded — business-proof verification required",
  verifying: "Business proof is being checked",
  under_review:
    "Business proof received — verification is in progress",
  needs_correction: "Business proof needs correction",
  verified: "Business proof verified",
};

export function resolveRegistrationReadiness(
  input: RegistrationReadinessInput
): RegistrationReadiness {
  const declarationsAccepted =
    input.declarationsAccepted === true;

  const evidenceChecks = [
    input.legalProofReady,
    input.practicalProofReady,
    input.liveSelfieReady,
  ];

  const evidenceCompleted = evidenceChecks.filter(Boolean).length;

  const evidenceCollectionProgress = Math.round(
    (evidenceCompleted / evidenceChecks.length) * 100
  );

  const evidenceCollectionComplete =
    evidenceCompleted === evidenceChecks.length;

  const businessProofReady =
    input.businessProofStatus === "verified";

  const steps: RegistrationReadinessStep[] = [
    {
      key: "identity",
      label: "Complete your identity and contact details",
      complete: input.identityReady,
    },
    {
      key: "address",
      label: "Verify your official and live business address",
      complete: input.addressReady,
    },
    {
      key: "about",
      label: "Add truthful information about yourself and your work",
      complete: input.aboutReady,
    },
    {
      key: "coverage",
      label: "Define where you provide your service",
      complete: input.coverageReady,
    },
    {
      key: "legal-proof",
      label: "Add one valid legal business proof",
      complete: input.legalProofReady,
    },
    {
      key: "practical-proof",
      label: "Add practical workplace or project evidence",
      complete: input.practicalProofReady,
    },
    {
      key: "live-selfie",
      label: "Add the required live business-board selfie",
      complete: input.liveSelfieReady,
    },
    {
      key: "business-proof",
      label: BUSINESS_PROOF_STATUS_LABELS[input.businessProofStatus],
      complete: businessProofReady,
    },
    {
      key: "declarations",
      label: "Accept the final truthful declarations",
      complete: declarationsAccepted,
    },
  ];

  const completedRequiredSteps =
    steps.filter((step) => step.complete).length;

  const requiredStepCount = steps.length;

  const progressPercent = Math.round(
    (completedRequiredSteps / requiredStepCount) * 100
  );

  const pendingSteps =
    steps.filter((step) => !step.complete);

  const registrationReady =
    pendingSteps.length === 0;

  return {
    identityReady: input.identityReady,
    addressReady: input.addressReady,
    aboutReady: input.aboutReady,
    coverageReady: input.coverageReady,

    legalProofReady: input.legalProofReady,
    practicalProofReady: input.practicalProofReady,
    liveSelfieReady: input.liveSelfieReady,

    evidenceCollectionComplete,
    evidenceCollectionProgress,

    businessProofStatus: input.businessProofStatus,
    businessProofReady,
    businessProofStatusLabel:
      BUSINESS_PROOF_STATUS_LABELS[input.businessProofStatus],

    declarationsAccepted,
    registrationReady,
    activationAllowed:
      registrationReady &&
      input.dashboardActivated !== true,
    dashboardActivated:
      input.dashboardActivated === true,

    completedRequiredSteps,
    requiredStepCount,
    progressPercent,

    steps,
    pendingSteps,
    nextRequiredStep: pendingSteps[0] || null,
  };
}

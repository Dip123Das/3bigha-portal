export type IndividualProfessionalAiStatus =
  | "not_started"
  | "analysing"
  | "strong_match"
  | "likely_match"
  | "unclear"
  | "likely_unrelated"
  | "contractor_risk"
  | "human_review"
  | "failed";

export type LifetimeFreeDecisionStatus =
  | "not_evaluated"
  | "pending_ai_review"
  | "pending_human_review"
  | "eligible_after_human_approval"
  | "approved"
  | "not_eligible"
  | "reclassified_as_business";

export type IndividualProfessionalVerificationInput = {
  economicMode: string;
  workerDeclarationAccepted: boolean;
  originalNameWarningAccepted: boolean;

  selfieVerificationStatus: string;
  workEvidenceVerificationStatus: string;
  identityNameMatchStatus: string;

  contractorRiskStatus: string;
  aiVerificationStatus: IndividualProfessionalAiStatus;
  aiConfidence: number | null;
};

export type IndividualProfessionalVerificationProjection = {
  canEnterHumanReview: boolean;
  aiBlocksAutomaticProgress: boolean;
  recommendedDecision: LifetimeFreeDecisionStatus;
  reason: string;
  warnings: string[];
};

function clampConfidence(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(1, value));
}

export function resolveIndividualProfessionalVerification(
  input: IndividualProfessionalVerificationInput
): IndividualProfessionalVerificationProjection {
  const warnings: string[] = [];
  const confidence = clampConfidence(input.aiConfidence);

  if (input.economicMode !== "self_working_individual") {
    return {
      canEnterHumanReview: false,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "reclassified_as_business",
      reason:
        "The declared operating mode is not a self-working individual.",
      warnings: [
        "Contractors and business operators are not eligible for the lifetime-free individual professional pathway.",
      ],
    };
  }

  if (!input.workerDeclarationAccepted) {
    return {
      canEnterHumanReview: false,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "not_evaluated",
      reason:
        "The self-working professional declaration has not been accepted.",
      warnings: [
        "The applicant must confirm that they personally perform the declared work.",
      ],
    };
  }

  if (!input.originalNameWarningAccepted) {
    warnings.push(
      "The original-name declaration has not been accepted."
    );
  }

  if (
    input.selfieVerificationStatus !== "verified" &&
    input.selfieVerificationStatus !== "pending_review" &&
    input.selfieVerificationStatus !== "captured"
  ) {
    warnings.push(
      "The mandatory live selfie is incomplete or unusable."
    );
  }

  if (
    input.workEvidenceVerificationStatus !== "verified" &&
    input.workEvidenceVerificationStatus !== "pending_review"
  ) {
    warnings.push(
      "The two mandatory live work photographs are incomplete or require correction."
    );
  }

  if (
    input.contractorRiskStatus === "confirmed_contractor"
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "reclassified_as_business",
      reason:
        "Contractor activity has been confirmed.",
      warnings: [
        "The applicant must continue through Business Registration.",
      ],
    };
  }

  if (
    input.aiVerificationStatus === "contractor_risk" ||
    input.contractorRiskStatus === "review_required"
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "pending_human_review",
      reason:
        "Possible contractor or business activity requires human classification.",
      warnings: [
        "AI cannot independently reclassify or suspend the applicant.",
      ],
    };
  }

  if (
    input.aiVerificationStatus === "likely_unrelated"
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "pending_human_review",
      reason:
        "The submitted work evidence appears unrelated to the declared skill.",
      warnings: [
        "Request clearer live work photographs or conduct human review.",
      ],
    };
  }

  if (
    input.identityNameMatchStatus === "mismatch"
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "pending_human_review",
      reason:
        "The declared name and identity-document name appear inconsistent.",
      warnings: [
        "Allow correction for spelling, transliteration and document-reading differences before taking adverse action.",
      ],
    };
  }

  if (
    warnings.length > 0 ||
    input.aiVerificationStatus === "unclear" ||
    input.aiVerificationStatus === "human_review" ||
    input.aiVerificationStatus === "failed"
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: true,
      recommendedDecision: "pending_human_review",
      reason:
        "The application requires human verification.",
      warnings,
    };
  }

  if (
    ["strong_match", "likely_match"].includes(
      input.aiVerificationStatus
    ) &&
    confidence >= 0.65
  ) {
    return {
      canEnterHumanReview: true,
      aiBlocksAutomaticProgress: false,
      recommendedDecision:
        "eligible_after_human_approval",
      reason:
        "The evidence is sufficiently consistent to enter final human approval.",
      warnings: [
        "AI recommendation is advisory and does not itself activate lifetime-free eligibility.",
      ],
    };
  }

  return {
    canEnterHumanReview: true,
    aiBlocksAutomaticProgress: true,
    recommendedDecision: "pending_human_review",
    reason:
      "The available evidence is not strong enough for a positive recommendation.",
    warnings: [
      "Request clearer evidence or complete human review.",
    ],
  };
}

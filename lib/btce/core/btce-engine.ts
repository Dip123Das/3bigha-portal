import { BTCE_DOMAIN_ORDER, BTCE_VERSION } from "@/lib/btce/shared/constants";
import { buildTrustExplanation } from "@/lib/btce/core/explanation-engine";
import {
  confidenceBand,
  normalizeDomainWeights,
  scoreDomain,
} from "@/lib/btce/core/scoring-engine";
import type {
  BtceEvaluationInput,
  BtceTrustResult,
} from "@/lib/btce/shared/btce-types";

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function evaluateBusinessTrust(
  input: BtceEvaluationInput
): BtceTrustResult {
  const weights = normalizeDomainWeights(input.weights);
  const domains = BTCE_DOMAIN_ORDER.map((domain) =>
    scoreDomain(domain, input.evidence, weights[domain])
  );

  const score = Math.round(
    domains.reduce((sum, domain) => sum + domain.weightedScore, 0)
  );

  const evidenceWithConfidence = input.evidence.flatMap((item) =>
    (item.assessments ?? [])
      .map((assessment) => assessment.confidence)
      .filter((value): value is number => value != null)
  );

  const averageAssessmentConfidence = evidenceWithConfidence.length
    ? evidenceWithConfidence.reduce((sum, value) => sum + clamp(value), 0) /
      evidenceWithConfidence.length
    : 0;

  const domainCoverage =
    (domains.filter((domain) => domain.evidenceCount > 0).length /
      domains.length) *
    100;

  const confidence = Math.round(
    averageAssessmentConfidence * 0.7 + domainCoverage * 0.3
  );

  const evidenceSummary = {
    total: input.evidence.length,
    accepted: input.evidence.filter((item) => item.status === "accepted").length,
    needsReview: input.evidence.filter(
      (item) => item.status === "needs_review"
    ).length,
    rejected: input.evidence.filter((item) => item.status === "rejected").length,
    expired: input.evidence.filter((item) => item.status === "expired").length,
  };

  const requiresHumanReview = input.evidence.some(
    (item) =>
      item.status === "needs_review" ||
      item.assessments?.some((assessment) => assessment.requiresHumanReview)
  );

  const result: BtceTrustResult = {
    version: BTCE_VERSION,
    businessId: input.businessId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    score: clamp(score),
    confidence: clamp(confidence),
    confidenceBand: confidenceBand(confidence),
    domains,
    capabilityClaims: input.capabilityClaims ?? [],
    explanation: [],
    requiresHumanReview,
    evidenceSummary,
  };

  result.explanation = buildTrustExplanation(domains, input.evidence);
  return result;
}

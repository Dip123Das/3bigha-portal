import {
  BTCE_DEFAULT_DOMAIN_WEIGHTS,
  BTCE_DOMAIN_ORDER,
  BTCE_EVIDENCE_STATUS_VALUE,
} from "@/lib/btce/shared/constants";
import type {
  BtceConfidenceBand,
  BtceDomainScore,
  BtceEvidence,
  BtceEvidenceAssessment,
  BtceTrustDomain,
} from "@/lib/btce/shared/btce-types";

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function latestAssessment(
  assessments: BtceEvidenceAssessment[] | undefined
): BtceEvidenceAssessment | null {
  if (!assessments?.length) return null;

  return [...assessments].sort(
    (left, right) =>
      Date.parse(right.assessedAt) - Date.parse(left.assessedAt)
  )[0] ?? null;
}

function assessmentFactor(evidence: BtceEvidence) {
  const assessment = latestAssessment(evidence.assessments);
  if (!assessment) return 0.55;

  const confidence =
    assessment.confidence == null ? 0.5 : clamp(assessment.confidence) / 100;

  switch (assessment.decision) {
    case "support":
      return 0.65 + confidence * 0.35;
    case "neutral":
      return 0.4 + confidence * 0.2;
    case "review":
      return 0.25 + confidence * 0.25;
    case "contradict":
      return Math.max(0, 0.2 - confidence * 0.2);
  }
}

function evidenceValue(evidence: BtceEvidence) {
  const statusValue = BTCE_EVIDENCE_STATUS_VALUE[evidence.status];
  return clamp(statusValue * assessmentFactor(evidence) * 100);
}

export function confidenceBand(score: number): BtceConfidenceBand {
  if (!Number.isFinite(score) || score <= 0) return "unavailable";
  if (score < 25) return "very_low";
  if (score < 45) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "high";
  return "very_high";
}

export function normalizeDomainWeights(
  supplied?: Partial<Record<BtceTrustDomain, number>>
): Record<BtceTrustDomain, number> {
  const raw = Object.fromEntries(
    BTCE_DEFAULT_DOMAIN_WEIGHTS.map(({ domain, weight }) => [
      domain,
      supplied?.[domain] ?? weight,
    ])
  ) as Record<BtceTrustDomain, number>;

  const total = BTCE_DOMAIN_ORDER.reduce(
    (sum, domain) => sum + Math.max(0, raw[domain]),
    0
  );

  if (total <= 0) {
    return Object.fromEntries(
      BTCE_DEFAULT_DOMAIN_WEIGHTS.map(({ domain, weight }) => [domain, weight])
    ) as Record<BtceTrustDomain, number>;
  }

  return Object.fromEntries(
    BTCE_DOMAIN_ORDER.map((domain) => [
      domain,
      (Math.max(0, raw[domain]) / total) * 100,
    ])
  ) as Record<BtceTrustDomain, number>;
}

export function scoreDomain(
  domain: BtceTrustDomain,
  evidence: BtceEvidence[],
  weight: number
): BtceDomainScore {
  const domainEvidence = evidence.filter((item) => item.domain === domain);
  const activeEvidence = domainEvidence.filter(
    (item) => item.status !== "expired" && item.status !== "rejected"
  );
  const acceptedEvidence = domainEvidence.filter(
    (item) => item.status === "accepted"
  );
  const reviewEvidence = domainEvidence.filter(
    (item) => item.status === "needs_review"
  );

  const rawScore = activeEvidence.length
    ? activeEvidence.reduce((sum, item) => sum + evidenceValue(item), 0) /
      activeEvidence.length
    : 0;

  const assessedEvidence = activeEvidence.filter(
    (item) => item.assessments?.length
  );
  const assessmentConfidence = assessedEvidence.length
    ? assessedEvidence.reduce((sum, item) => {
        const confidence = latestAssessment(item.assessments)?.confidence;
        return sum + (confidence == null ? 50 : clamp(confidence));
      }, 0) / assessedEvidence.length
    : 0;

  const coverageConfidence = clamp(activeEvidence.length * 20);
  const confidence = clamp(
    assessmentConfidence * 0.7 + coverageConfidence * 0.3
  );

  const explanation: string[] = [];
  if (!domainEvidence.length) {
    explanation.push(`No ${domain} evidence has been submitted.`);
  } else {
    explanation.push(
      `${acceptedEvidence.length} of ${domainEvidence.length} ${domain} evidence item(s) are accepted.`
    );
  }

  if (reviewEvidence.length) {
    explanation.push(
      `${reviewEvidence.length} ${domain} evidence item(s) require human review.`
    );
  }

  return {
    domain,
    rawScore: Math.round(rawScore),
    weightedScore: Number(((rawScore * weight) / 100).toFixed(2)),
    maximumWeightedScore: Number(weight.toFixed(2)),
    confidence: Math.round(confidence),
    confidenceBand: confidenceBand(confidence),
    evidenceCount: domainEvidence.length,
    acceptedEvidenceCount: acceptedEvidence.length,
    reviewEvidenceCount: reviewEvidence.length,
    explanation,
  };
}

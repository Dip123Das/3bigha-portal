import type {
  BtceCapabilityClaim,
  BtceEvidence,
  BtceEvidenceAssessment,
} from "@/lib/btce/shared/btce-types";

export type BtceCapabilityIntelligence = {
  code: string;
  label: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  supportingEvidenceCount: number;
  reviewEvidenceCount: number;
  explanation: string[];
  requiresHumanReview: boolean;
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function latestAssessment(evidence: BtceEvidence): BtceEvidenceAssessment | null {
  if (!evidence.assessments?.length) return null;
  return [...evidence.assessments].sort(
    (a, b) => Date.parse(b.assessedAt) - Date.parse(a.assessedAt)
  )[0] ?? null;
}

function supportsClaim(evidence: BtceEvidence, claim: BtceCapabilityClaim) {
  const tags = new Set((evidence.capabilityTags ?? []).map((tag) => tag.toLowerCase()));
  return (
    tags.has(claim.code.toLowerCase()) ||
    (claim.tags ?? []).some((tag) => tags.has(tag.toLowerCase()))
  );
}

export function evaluateCapabilityIntelligence(
  claims: BtceCapabilityClaim[],
  evidence: BtceEvidence[]
): BtceCapabilityIntelligence[] {
  return claims.map((claim) => {
    const related = evidence.filter((item) => supportsClaim(item, claim));
    const supporting = related.filter(
      (item) =>
        item.status === "accepted" ||
        latestAssessment(item)?.decision === "support"
    );
    const review = related.filter(
      (item) =>
        item.status === "needs_review" ||
        latestAssessment(item)?.requiresHumanReview
    );

    const confidenceValues = related
      .map((item) => latestAssessment(item)?.confidence)
      .filter((value): value is number => typeof value === "number");

    const confidence = confidenceValues.length
      ? Math.round(
          confidenceValues.reduce((sum, value) => sum + clamp(value), 0) /
            confidenceValues.length
        )
      : 0;

    const coverageScore = clamp(related.length * 20);
    const supportRatio = related.length ? supporting.length / related.length : 0;
    const score = Math.round(coverageScore * 0.4 + supportRatio * 60);

    const explanation: string[] = [];
    if (!related.length) {
      explanation.push("This capability is declared but has no linked supporting evidence.");
    } else {
      explanation.push(
        `${supporting.length} of ${related.length} linked evidence item(s) currently support this capability.`
      );
    }
    if (review.length) {
      explanation.push(`${review.length} linked evidence item(s) require human review.`);
    }

    return {
      code: claim.code,
      label: claim.label,
      score,
      confidence,
      evidenceCount: related.length,
      supportingEvidenceCount: supporting.length,
      reviewEvidenceCount: review.length,
      explanation,
      requiresHumanReview: review.length > 0,
    };
  });
}

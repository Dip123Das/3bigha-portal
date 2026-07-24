import type {
  BtceDomainScore,
  BtceEvidence,
  BtceTrustResult,
} from "@/lib/btce/shared/btce-types";

export function buildTrustExplanation(
  domains: BtceDomainScore[],
  evidence: BtceEvidence[]
): string[] {
  const explanation: string[] = [];

  const strongest = [...domains]
    .filter((domain) => domain.evidenceCount > 0)
    .sort((left, right) => right.weightedScore - left.weightedScore)[0];

  const weakest = [...domains]
    .sort((left, right) => left.rawScore - right.rawScore)[0];

  if (strongest) {
    explanation.push(
      `${strongest.domain} evidence currently provides the strongest support.`
    );
  }

  if (weakest && weakest.rawScore < 60) {
    explanation.push(
      `${weakest.domain} trust can be strengthened with more accepted evidence.`
    );
  }

  const reviewCount = evidence.filter(
    (item) =>
      item.status === "needs_review" ||
      item.assessments?.some((assessment) => assessment.requiresHumanReview)
  ).length;

  if (reviewCount) {
    explanation.push(
      `${reviewCount} evidence item(s) remain subject to human review.`
    );
  }

  if (!explanation.length) {
    explanation.push("Trust will become explainable as evidence is submitted.");
  }

  return explanation;
}

export function summarizeTrustResult(result: BtceTrustResult) {
  return {
    score: result.score,
    confidence: result.confidence,
    confidenceBand: result.confidenceBand,
    requiresHumanReview: result.requiresHumanReview,
    strongestDomains: [...result.domains]
      .sort((left, right) => right.weightedScore - left.weightedScore)
      .slice(0, 3)
      .map((domain) => ({
        domain: domain.domain,
        score: domain.rawScore,
        contribution: domain.weightedScore,
      })),
    explanation: result.explanation,
  };
}

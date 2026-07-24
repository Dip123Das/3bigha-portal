import type {
  BtceEvidenceAssessment,
} from "@/lib/btce/shared/btce-types";
import type { BiePipelineResult } from "@/lib/bie/shared/bie-types";

export function adaptBieResultToBtceAssessment(
  result: BiePipelineResult
): BtceEvidenceAssessment {
  const supporting = result.outputs.filter(
    (output) => output.decision === "support"
  ).length;
  const contradicting = result.outputs.filter(
    (output) => output.decision === "contradict"
  ).length;

  const confidenceValues = result.outputs
    .map((output) => output.confidence)
    .filter((value): value is number => value != null);

  const confidence = confidenceValues.length
    ? Math.round(
        confidenceValues.reduce((sum, value) => sum + value, 0) /
          confidenceValues.length
      )
    : null;

  return {
    authority: "system",
    decision:
      contradicting > 0
        ? "review"
        : supporting > 0
        ? "support"
        : "neutral",
    confidence,
    assessedAt: result.generatedAt,
    assessor: "business-intelligence-engine",
    summary:
      result.outputs.length > 0
        ? `${result.outputs.length} intelligence analyzer(s) produced structured evidence signals.`
        : "No compatible intelligence analyzer was available for this evidence.",
    reasons: result.outputs.flatMap((output) => output.reasons),
    signals: result.signals,
    requiresHumanReview: result.requiresHumanReview,
  };
}

import type {
  BieAnalyzerInput,
  BiePipelineResult,
} from "@/lib/bie/shared/bie-types";
import { BieAnalyzerRegistry } from "@/lib/bie/core/analyzer-registry";
import { mergeBieSignals } from "@/lib/bie/core/signal-normalizer";

export class BusinessIntelligenceEngine {
  constructor(private readonly registry: BieAnalyzerRegistry) {}

  async analyze(input: BieAnalyzerInput): Promise<BiePipelineResult> {
    const analyzers = this.registry.resolve(input);
    const generatedAt = new Date().toISOString();

    if (!analyzers.length) {
      return {
        assetId: input.asset.id,
        businessId: input.asset.businessId,
        status: "needs_review",
        outputs: [],
        signals: [],
        capabilityTags: [],
        businessTags: [],
        requiresHumanReview: true,
        generatedAt,
      };
    }

    const settled = await Promise.allSettled(
      analyzers.map((analyzer) => analyzer.analyze(input))
    );

    const outputs = settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    );

    const failures = settled.filter((result) => result.status === "rejected");
    const signals = mergeBieSignals(outputs.flatMap((output) => output.signals));
    const capabilityTags = [
      ...new Set(outputs.flatMap((output) => output.capabilityTags ?? [])),
    ];
    const businessTags = [
      ...new Set(outputs.flatMap((output) => output.businessTags ?? [])),
    ];

    const requiresHumanReview =
      failures.length > 0 ||
      outputs.some((output) => output.requiresHumanReview);

    return {
      assetId: input.asset.id,
      businessId: input.asset.businessId,
      status:
        outputs.length === 0
          ? "failed"
          : requiresHumanReview
          ? "needs_review"
          : "completed",
      outputs,
      signals,
      capabilityTags,
      businessTags,
      requiresHumanReview,
      generatedAt,
    };
  }
}

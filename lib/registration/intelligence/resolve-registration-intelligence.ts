import type { UploadedMediaAsset } from "@/lib/media/media-config";
import {
  adaptRegistrationEvidence,
  evaluateBusinessTrust,
  evaluateCapabilityIntelligence,
} from "@/lib/btce";
import type {
  BtceCapabilityClaim,
  BtceEvidence,
  BtceTrustResult,
} from "@/lib/btce/shared/btce-types";
import type { BiePipelineResult } from "@/lib/bie";
import { adaptBieResultToBtceAssessment } from "@/lib/bie";

export type RegistrationIntelligenceInput = {
  businessId: string;
  assets: UploadedMediaAsset[];
  documentVerification?: {
    documents?: Array<Record<string, unknown>> | null;
  } | null;
  capabilityClaims?: BtceCapabilityClaim[];
  bieResults?: BiePipelineResult[];
  generatedAt?: string;
};

export type RegistrationIntelligenceSnapshot = {
  version: "registration-intelligence-v1";
  businessId: string;
  generatedAt: string;
  evidence: BtceEvidence[];
  trust: BtceTrustResult;
  capabilities: ReturnType<typeof evaluateCapabilityIntelligence>;
  processing: {
    registrationEvidenceCount: number;
    bieAssessmentCount: number;
    unmatchedBieResultCount: number;
  };
};

function attachBieAssessments(
  evidence: BtceEvidence[],
  results: BiePipelineResult[]
) {
  const byAssetId = new Map(
    evidence.map((item) => [
      String(item.metadata?.sourceAssetId || item.id.replace(/^registration:/, "")),
      item,
    ])
  );

  let attached = 0;
  let unmatched = 0;

  for (const result of results) {
    const evidenceItem = byAssetId.get(result.assetId);

    if (!evidenceItem) {
      unmatched += 1;
      continue;
    }

    evidenceItem.assessments = [
      ...(evidenceItem.assessments ?? []),
      adaptBieResultToBtceAssessment(result),
    ];

    evidenceItem.capabilityTags = [
      ...new Set([
        ...(evidenceItem.capabilityTags ?? []),
        ...result.capabilityTags,
      ]),
    ];

    evidenceItem.businessTags = [
      ...new Set([
        ...(evidenceItem.businessTags ?? []),
        ...result.businessTags,
      ]),
    ];

    if (result.requiresHumanReview) {
      evidenceItem.status = "needs_review";
    } else if (result.outputs.length > 0) {
      evidenceItem.status = "accepted";
    }

    attached += 1;
  }

  return { attached, unmatched };
}

export function resolveRegistrationIntelligence(
  input: RegistrationIntelligenceInput
): RegistrationIntelligenceSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const capabilityClaims = input.capabilityClaims ?? [];

  const evidence = adaptRegistrationEvidence({
    businessId: input.businessId,
    assets: input.assets,
    documentVerification: input.documentVerification as any,
    capabilityClaims,
    submittedAt: generatedAt,
  }).map((item) => ({
    ...item,
    metadata: {
      ...(item.metadata ?? {}),
      sourceAssetId: item.id.replace(/^registration:/, ""),
    },
    assessments: [...(item.assessments ?? [])],
    capabilityTags: [...(item.capabilityTags ?? [])],
    businessTags: [...(item.businessTags ?? [])],
  }));

  const attachment = attachBieAssessments(evidence, input.bieResults ?? []);

  const trust = evaluateBusinessTrust({
    businessId: input.businessId,
    evidence,
    capabilityClaims,
    generatedAt,
  });

  const capabilities = evaluateCapabilityIntelligence(
    capabilityClaims,
    evidence
  );

  return {
    version: "registration-intelligence-v1",
    businessId: input.businessId,
    generatedAt,
    evidence,
    trust,
    capabilities,
    processing: {
      registrationEvidenceCount: evidence.length,
      bieAssessmentCount: attachment.attached,
      unmatchedBieResultCount: attachment.unmatched,
    },
  };
}

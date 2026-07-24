import type { UploadedMediaAsset } from "@/lib/media/media-config";
import type {
  BtceCapabilityClaim,
  BtceEvidence,
  BtceEvidenceAssessment,
  BtceEvidenceStatus,
  BtceTrustDomain,
} from "@/lib/btce/shared/btce-types";

type RegistrationDocumentResult = {
  documentType?: string | null;
  type?: string | null;
  status?: string | null;
  confidence?: number | null;
  summary?: string | null;
  reasons?: string[] | null;
  fileName?: string | null;
  assetId?: string | null;
  path?: string | null;
};

export type RegistrationEvidenceAdapterInput = {
  businessId: string;
  assets: UploadedMediaAsset[];
  documentVerification?: {
    documents?: RegistrationDocumentResult[] | null;
  } | null;
  capabilityClaims?: BtceCapabilityClaim[];
  submittedAt?: string;
};

const LEGAL_KINDS = ["gst", "trade-license", "udyam", "other"] as const;
const PHYSICAL_KINDS = [
  "signboard",
  "frontage",
  "workplace",
  "machinery",
  "stock",
  "activity",
  "warehouse",
  "factory",
  "other",
] as const;

function includesPath(asset: UploadedMediaAsset, segment: string) {
  return String(asset.path || "").toLowerCase().includes(segment.toLowerCase());
}

function stableSubmittedAt(input?: string) {
  return input ?? new Date().toISOString();
}

function normaliseConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function documentDecision(status?: string | null): {
  decision: BtceEvidenceAssessment["decision"];
  evidenceStatus: BtceEvidenceStatus;
  requiresHumanReview: boolean;
} {
  switch (String(status || "").toLowerCase()) {
    case "verified_by_ai":
    case "verified":
    case "accepted":
      return {
        decision: "support",
        evidenceStatus: "accepted",
        requiresHumanReview: false,
      };
    case "document_mismatch":
    case "format_invalid":
    case "rejected":
      return {
        decision: "contradict",
        evidenceStatus: "needs_review",
        requiresHumanReview: true,
      };
    case "processing":
      return {
        decision: "neutral",
        evidenceStatus: "processing",
        requiresHumanReview: false,
      };
    default:
      return {
        decision: "review",
        evidenceStatus: "needs_review",
        requiresHumanReview: true,
      };
  }
}

function matchDocumentResult(
  asset: UploadedMediaAsset,
  results: RegistrationDocumentResult[]
) {
  return results.find((result) => {
    const candidates = [result.assetId, result.fileName, result.path]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (!candidates.length) return false;

    const assetCandidates = [asset.id, asset.name, asset.path].map((value) =>
      String(value || "").toLowerCase()
    );

    return candidates.some((candidate) =>
      assetCandidates.some(
        (assetCandidate) =>
          assetCandidate === candidate ||
          assetCandidate.includes(candidate) ||
          candidate.includes(assetCandidate)
      )
    );
  }) ?? null;
}

function legalKind(asset: UploadedMediaAsset) {
  return (
    LEGAL_KINDS.find((kind) =>
      includesPath(asset, `/legal-proof/${kind}/`)
    ) ?? (includesPath(asset, "/legal-proof/") ? "other" : null)
  );
}

function physicalKind(asset: UploadedMediaAsset) {
  return (
    PHYSICAL_KINDS.find((kind) =>
      includesPath(asset, `/practical-proof/${kind}/`)
    ) ?? (includesPath(asset, "/practical-proof/") ? "other" : null)
  );
}

function baseEvidence(
  businessId: string,
  asset: UploadedMediaAsset,
  submittedAt: string,
  domain: BtceTrustDomain,
  type: string,
  title: string
): BtceEvidence {
  return {
    id: `registration:${asset.id}`,
    businessId,
    domain,
    type,
    source: "user_upload",
    status: "submitted",
    title,
    description: asset.name,
    assetUrl: asset.url,
    mimeType: asset.mimeType,
    submittedAt,
    metadata: {
      storageBucket: asset.bucket,
      storagePath: asset.path,
      originalName: asset.name,
      sizeBytes: asset.size,
      mediaKind: asset.kind,
      adapter: "registration-evidence-adapter-v1",
    },
  };
}

function adaptLegalEvidence(
  businessId: string,
  asset: UploadedMediaAsset,
  kind: string,
  submittedAt: string,
  documentResults: RegistrationDocumentResult[]
): BtceEvidence {
  const evidence = baseEvidence(
    businessId,
    asset,
    submittedAt,
    "legal",
    `registration.legal.${kind}`,
    `${kind.replace(/-/g, " ")} legal proof`
  );

  const result = matchDocumentResult(asset, documentResults);
  if (!result) return evidence;

  const mapped = documentDecision(result.status);
  evidence.status = mapped.evidenceStatus;
  evidence.assessments = [
    {
      authority: "ai",
      decision: mapped.decision,
      confidence: normaliseConfidence(result.confidence),
      assessedAt: submittedAt,
      assessor: "registration-document-verification",
      summary:
        result.summary ||
        `Document verification status: ${String(
          result.status || "needs_manual_review"
        ).replace(/_/g, " ")}.`,
      reasons: Array.isArray(result.reasons) ? result.reasons : [],
      requiresHumanReview: mapped.requiresHumanReview,
    },
  ];

  return evidence;
}

function adaptPhysicalEvidence(
  businessId: string,
  asset: UploadedMediaAsset,
  kind: string,
  submittedAt: string
): BtceEvidence {
  const capabilityKinds = new Set([
    "machinery",
    "stock",
    "activity",
    "warehouse",
    "factory",
  ]);

  const evidence = baseEvidence(
    businessId,
    asset,
    submittedAt,
    "physical",
    `registration.physical.${kind}`,
    `${kind.replace(/-/g, " ")} physical evidence`
  );

  evidence.capabilityTags = capabilityKinds.has(kind) ? [kind] : [];
  evidence.businessTags = ["registration", "physical-presence"];
  return evidence;
}

function adaptSelfieEvidence(
  businessId: string,
  asset: UploadedMediaAsset,
  submittedAt: string
): BtceEvidence {
  const evidence = baseEvidence(
    businessId,
    asset,
    submittedAt,
    "identity",
    "registration.identity.live-selfie",
    "Live business-board selfie"
  );

  evidence.businessTags = ["registration", "identity-continuity"];
  return evidence;
}

function capabilityClaimEvidence(
  businessId: string,
  claim: BtceCapabilityClaim,
  submittedAt: string
): BtceEvidence {
  return {
    id: `registration:capability:${claim.code}`,
    businessId,
    domain: "capability",
    type: "registration.capability.declaration",
    source: "user_upload",
    status: "submitted",
    title: claim.label,
    description: claim.description,
    submittedAt: claim.declaredAt ?? submittedAt,
    capabilityTags: [claim.code, ...(claim.tags ?? [])],
    metadata: {
      declarationOnly: true,
      adapter: "registration-evidence-adapter-v1",
    },
    assessments: [
      {
        authority: "system",
        decision: "neutral",
        confidence: 100,
        assessedAt: claim.declaredAt ?? submittedAt,
        assessor: "registration-evidence-adapter",
        summary:
          "Capability has been declared but still requires supporting evidence.",
        reasons: ["A declaration is not treated as proof of capability."],
        requiresHumanReview: false,
      },
    ],
  };
}

export function adaptRegistrationEvidence(
  input: RegistrationEvidenceAdapterInput
): BtceEvidence[] {
  const submittedAt = stableSubmittedAt(input.submittedAt);
  const documentResults = Array.isArray(input.documentVerification?.documents)
    ? input.documentVerification.documents
    : [];

  const evidence = input.assets.flatMap((asset): BtceEvidence[] => {
    const legal = legalKind(asset);
    if (legal) {
      return [
        adaptLegalEvidence(
          input.businessId,
          asset,
          legal,
          submittedAt,
          documentResults
        ),
      ];
    }

    const physical = physicalKind(asset);
    if (physical) {
      return [
        adaptPhysicalEvidence(
          input.businessId,
          asset,
          physical,
          submittedAt
        ),
      ];
    }

    if (includesPath(asset, "/live-selfie/")) {
      return [adaptSelfieEvidence(input.businessId, asset, submittedAt)];
    }

    return [];
  });

  for (const claim of input.capabilityClaims ?? []) {
    evidence.push(capabilityClaimEvidence(input.businessId, claim, submittedAt));
  }

  return evidence;
}

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  generateRegistrationAiReviewBrief,
  type RegistrationAiReviewBrief,
} from "@/lib/admin/registration-ai-review";
import {
  generateRegistrationCrossVerification,
  type RegistrationCrossVerificationResult,
} from "@/lib/admin/registration-cross-verification";
import {
  generateRegistrationDocumentIntelligence,
  type RegistrationDocumentIntelligenceResult,
} from "@/lib/admin/registration-document-intelligence";

type EvidenceAsset = {
  bucket?: string;
  path?: string;
  sha256?: string;
  evidenceCategory?: string;
};

export type RegistrationOrchestrationResult = {
  version: "registration_orchestration_v1";
  userId: string;
  caseId: string | null;
  completedAt: string;
  documentCount: number;
  documentIntelligence: RegistrationDocumentIntelligenceResult[];
  crossVerification: RegistrationCrossVerificationResult[];
  trustIntelligence: Record<string, unknown> | null;
  aiReviewBrief: RegistrationAiReviewBrief;
  summary: {
    documentsProcessed: number;
    documentsNeedingManualReview: number;
    crossChecksCompleted: number;
    crossChecksNeedingManualReview: number;
    overallRecommendedAction:
      | "APPROVE"
      | "REQUEST_CORRECTION"
      | "MANUAL_REVIEW";
  };
  safeguards: {
    advisoryOnly: true;
    registrationStatusChanged: false;
    approvalStatusChanged: false;
    dashboardStatusChanged: false;
    subscriptionChanged: false;
    originalEvidenceModified: false;
  };
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function evidenceAssets(value: unknown): EvidenceAsset[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is EvidenceAsset =>
        Boolean(item) && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    return [value as EvidenceAsset];
  }

  return [];
}

async function loadRegistrationFacts(
  admin: SupabaseClient,
  userId: string,
  caseId?: string | null
) {
  const [businessRes, caseRes] =
    await Promise.all([
      admin
        .from("business_profiles")
        .select(
          "user_id,business_media_json,automated_verification_json"
        )
        .eq("user_id", userId)
        .maybeSingle(),
      caseId
        ? admin
            .from("registration_verification_cases")
            .select("id,user_id")
            .eq("id", caseId)
            .eq("user_id", userId)
            .maybeSingle()
        : admin
            .from("registration_verification_cases")
            .select("id,user_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

  if (businessRes.error || !businessRes.data) {
    throw new Error(
      "Business registration could not be loaded."
    );
  }

  if (caseRes.error) {
    throw new Error(
      "Verification case could not be loaded."
    );
  }

  const business =
    businessRes.data as unknown as Record<
      string,
      unknown
    >;
  const documents = evidenceAssets(
    business.business_media_json
  ).filter(
    (asset) =>
      asset.bucket === "registration-evidence" &&
      asset.evidenceCategory === "business_document" &&
      Boolean(clean(asset.path)) &&
      Boolean(clean(asset.sha256))
  );

  const uniqueDocuments = [
    ...new Map(
      documents.map((asset) => [
        clean(asset.sha256),
        asset,
      ])
    ).values(),
  ];

  const automated =
    business.automated_verification_json &&
    typeof business.automated_verification_json === "object"
      ? business.automated_verification_json as Record<string, unknown>
      : {};
  const trust =
    automated.trustIntelligence &&
    typeof automated.trustIntelligence === "object"
      ? automated.trustIntelligence as Record<string, unknown>
      : null;
  const caseRecord =
    caseRes.data as unknown as Record<string, unknown> | null;

  return {
    caseId: clean(caseRecord?.id) || caseId || null,
    documents: uniqueDocuments,
    trust,
  };
}

function finalAction(
  aiBrief: RegistrationAiReviewBrief,
  crossVerification: RegistrationCrossVerificationResult[]
) {
  if (
    crossVerification.some(
      (item) => item.recommendedAction === "manual_review"
    )
  ) {
    return "MANUAL_REVIEW" as const;
  }

  if (
    crossVerification.some(
      (item) => item.recommendedAction === "request_correction"
    )
  ) {
    return "REQUEST_CORRECTION" as const;
  }

  return aiBrief.recommendedAction;
}

export async function orchestrateRegistrationReview(
  admin: SupabaseClient,
  input: {
    reviewerId: string;
    userId: string;
    caseId?: string | null;
  }
): Promise<RegistrationOrchestrationResult> {
  const facts = await loadRegistrationFacts(
    admin,
    input.userId,
    input.caseId
  );

  const documentIntelligence: RegistrationDocumentIntelligenceResult[] = [];
  const crossVerification: RegistrationCrossVerificationResult[] = [];

  for (const document of facts.documents) {
    const intelligence =
      await generateRegistrationDocumentIntelligence(
        admin,
        {
          reviewerId: input.reviewerId,
          userId: input.userId,
          caseId: facts.caseId,
          evidencePath: clean(document.path),
        }
      );

    documentIntelligence.push(intelligence);

    const crossCheck =
      await generateRegistrationCrossVerification(
        admin,
        {
          reviewerId: input.reviewerId,
          userId: input.userId,
          caseId: facts.caseId,
          documentIntelligenceId: intelligence.id,
        }
      );

    crossVerification.push(crossCheck);
  }

  const aiReviewBrief =
    await generateRegistrationAiReviewBrief(
      admin,
      input.userId,
      facts.caseId
    );

  const recommendedAction = finalAction(
    aiReviewBrief,
    crossVerification
  );

  return {
    version: "registration_orchestration_v1",
    userId: input.userId,
    caseId: facts.caseId,
    completedAt: new Date().toISOString(),
    documentCount: facts.documents.length,
    documentIntelligence,
    crossVerification,
    trustIntelligence: facts.trust,
    aiReviewBrief: {
      ...aiReviewBrief,
      recommendedAction,
    },
    summary: {
      documentsProcessed: documentIntelligence.length,
      documentsNeedingManualReview:
        documentIntelligence.filter(
          (item) => item.status === "needs_manual_review"
        ).length,
      crossChecksCompleted: crossVerification.length,
      crossChecksNeedingManualReview:
        crossVerification.filter(
          (item) => item.status === "needs_manual_review"
        ).length,
      overallRecommendedAction: recommendedAction,
    },
    safeguards: {
      advisoryOnly: true,
      registrationStatusChanged: false,
      approvalStatusChanged: false,
      dashboardStatusChanged: false,
      subscriptionChanged: false,
      originalEvidenceModified: false,
    },
  };
}

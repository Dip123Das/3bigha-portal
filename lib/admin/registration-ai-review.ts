import type { SupabaseClient } from "@supabase/supabase-js";

export type RegistrationAiRecommendedAction =
  | "APPROVE"
  | "REQUEST_CORRECTION"
  | "MANUAL_REVIEW";

export type RegistrationAiReviewBrief = {
  version: "registration_ai_review_brief_v1";
  advisoryOnly: true;
  source: "openai_assisted" | "deterministic_fallback";
  summary: string;
  overallConfidence: number;
  recommendedAction: RegistrationAiRecommendedAction;
  positiveSignals: string[];
  concerns: string[];
  missingEvidence: string[];
  anomalies: string[];
  reviewFocus: string[];
  explanation: string;
  generatedAt: string;
  model: string | null;
  factsUsed: {
    registrationStatus: string;
    trustScore: number;
    riskLevel: string;
    evidenceCount: number;
    documentCount: number;
    decisionEventCount: number;
  };
  humanAuthorityNotice: string;
};

type EvidenceAsset = {
  path?: string;
  mimeType?: string;
  evidenceCategory?: string;
  captureSource?: string;
  captureTimestamp?: string;
  serverReceivedAt?: string;
  sha256?: string;
  evidenceBindingSha256?: string;
  captureMetadata?: Record<string, unknown> | null;
};

type ReviewContext = {
  userId: string;
  caseId: string | null;
  profile: Record<string, unknown>;
  business: Record<string, unknown>;
  verificationCase: Record<string, unknown>;
  decisionEvents: Record<string, unknown>[];
  evidence: EvidenceAsset[];
  documentResults: Record<string, unknown>[];
  trust: Record<string, unknown>;
};

const HUMAN_NOTICE =
  "This recommendation is advisory only. Final approval or rejection must be made by an authorized administrator after reviewing the underlying evidence.";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function clampScore(value: unknown) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item))
    .filter(Boolean)
    .slice(0, 12);
}

function objectArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object"
  );
}

function evidenceArray(value: unknown): EvidenceAsset[] {
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

function collectEvidence(
  business: Record<string, unknown>
) {
  const unique = new Map<string, EvidenceAsset>();

  for (const asset of [
    ...evidenceArray(business.selfie_media_json),
    ...evidenceArray(business.workplace_media_json),
    ...evidenceArray(business.business_media_json),
  ]) {
    const key =
      cleanString(asset.path) ||
      cleanString(asset.sha256) ||
      cleanString(asset.evidenceBindingSha256);

    if (key) unique.set(key, asset);
  }

  return [...unique.values()];
}

function collectDocumentResults(
  verificationCase: Record<string, unknown>,
  business: Record<string, unknown>
) {
  const caseResult =
    verificationCase.result_json &&
    typeof verificationCase.result_json === "object"
      ? verificationCase.result_json as Record<string, unknown>
      : {};
  const automated =
    business.automated_verification_json &&
    typeof business.automated_verification_json === "object"
      ? business.automated_verification_json as Record<string, unknown>
      : {};
  const vendorDocument =
    business.vendor_document_verification_json &&
    typeof business.vendor_document_verification_json === "object"
      ? business.vendor_document_verification_json as Record<string, unknown>
      : {};

  for (const candidate of [
    caseResult.documents,
    automated.documents,
    vendorDocument.documents,
  ]) {
    const documents = objectArray(candidate);
    if (documents.length) return documents;
  }

  return [];
}

function buildDeterministicSignals(context: ReviewContext) {
  const positiveSignals: string[] = [];
  const concerns: string[] = [];
  const missingEvidence: string[] = [];
  const anomalies: string[] = [];
  const reviewFocus: string[] = [];

  const trustScore = clampScore(context.trust.overallTrust);
  const locationTrust = clampScore(context.trust.locationTrust);
  const evidenceTrust = clampScore(context.trust.evidenceTrust);
  const captureIntegrity = clampScore(
    context.trust.captureIntegrityTrust
  );

  if (trustScore >= 85) {
    positiveSignals.push(
      `Overall trust intelligence is strong at ${trustScore}/100.`
    );
  } else if (trustScore < 65) {
    concerns.push(
      `Overall trust intelligence is low at ${trustScore}/100.`
    );
  }

  if (locationTrust >= 85) {
    positiveSignals.push(
      `Location verification is strong at ${locationTrust}/100.`
    );
  } else if (locationTrust < 60) {
    concerns.push(
      `Location verification is weak at ${locationTrust}/100.`
    );
    reviewFocus.push(
      "Confirm that the declared business location matches the captured GPS context."
    );
  }

  if (captureIntegrity >= 85) {
    positiveSignals.push(
      `Live-capture integrity is strong at ${captureIntegrity}/100.`
    );
  } else if (captureIntegrity < 60) {
    anomalies.push(
      `Live-capture integrity is low at ${captureIntegrity}/100.`
    );
    reviewFocus.push(
      "Inspect capture timestamps, GPS accuracy, mocked-location status and cryptographic binding."
    );
  }

  if (evidenceTrust >= 85) {
    positiveSignals.push(
      `Evidence trust is strong at ${evidenceTrust}/100.`
    );
  } else if (evidenceTrust < 60) {
    concerns.push(
      `Evidence trust is weak at ${evidenceTrust}/100.`
    );
  }

  const categories = new Set(
    context.evidence.map((asset) =>
      cleanString(asset.evidenceCategory)
    )
  );

  if (!categories.has("selfie")) {
    missingEvidence.push(
      "Verified live selfie evidence is missing."
    );
  }

  if (
    !categories.has("work_photo_one") &&
    !categories.has("work_photo_two")
  ) {
    missingEvidence.push(
      "Verified workplace or work-practice evidence is missing."
    );
  }

  if (!categories.has("business_document")) {
    missingEvidence.push(
      "Business registration document evidence is missing."
    );
  }

  for (const asset of context.evidence) {
    const metadata =
      asset.captureMetadata &&
      typeof asset.captureMetadata === "object"
        ? asset.captureMetadata
        : {};

    if (metadata.mocked === true) {
      anomalies.push(
        `${cleanString(asset.evidenceCategory) || "Evidence"} reports a mocked location.`
      );
    }

    const accuracy = Number(metadata.accuracy);

    if (Number.isFinite(accuracy) && accuracy > 100) {
      anomalies.push(
        `${cleanString(asset.evidenceCategory) || "Evidence"} has weak GPS accuracy of approximately ${Math.round(accuracy)} metres.`
      );
    }

    if (
      cleanString(asset.captureSource) === "live_camera" &&
      !cleanString(asset.evidenceBindingSha256)
    ) {
      anomalies.push(
        `${cleanString(asset.evidenceCategory) || "Live evidence"} is not cryptographically bound.`
      );
    }
  }

  for (const document of context.documentResults) {
    const label =
      cleanString(document.label) ||
      cleanString(document.documentType) ||
      "Business document";
    const status = cleanString(document.status);
    const confidence = clampScore(document.confidence);

    if (document.documentExpired === true) {
      anomalies.push(`${label} appears to be expired.`);
    }

    if (
      status === "document_mismatch" ||
      document.matched === false
    ) {
      concerns.push(
        `${label} contains a registration-number or document-content mismatch.`
      );
    }

    if (
      document.businessNameMatched === false &&
      cleanString(document.extractedBusinessName)
    ) {
      concerns.push(
        `${label} does not clearly match the declared business name.`
      );
    }

    if (
      document.addressMatched === false &&
      cleanString(document.extractedAddress)
    ) {
      reviewFocus.push(
        `Compare the declared address with the address extracted from ${label}.`
      );
    }

    for (const warning of stringArray(document.warnings)) {
      anomalies.push(`${label}: ${warning}`);
    }

    if (confidence >= 85 && status === "verified_by_ai") {
      positiveSignals.push(
        `${label} passed document checks with ${confidence}% confidence.`
      );
    } else if (confidence > 0 && confidence < 60) {
      concerns.push(
        `${label} has low document confidence of ${confidence}%.`
      );
    }
  }

  if (!reviewFocus.length) {
    reviewFocus.push(
      "Confirm that the private evidence visually matches the member, business and declared location."
    );
  }

  return {
    positiveSignals: [...new Set(positiveSignals)].slice(0, 8),
    concerns: [...new Set(concerns)].slice(0, 8),
    missingEvidence: [...new Set(missingEvidence)].slice(0, 8),
    anomalies: [...new Set(anomalies)].slice(0, 10),
    reviewFocus: [...new Set(reviewFocus)].slice(0, 8),
  };
}

function chooseDeterministicAction(
  context: ReviewContext,
  signals: ReturnType<typeof buildDeterministicSignals>
): RegistrationAiRecommendedAction {
  const trustScore = clampScore(context.trust.overallTrust);
  const riskLevel = cleanString(
    context.trust.riskLevel
  ).toUpperCase();

  if (
    signals.missingEvidence.length ||
    signals.concerns.some((item) =>
      /missing|mismatch|expired/i.test(item)
    )
  ) {
    return "REQUEST_CORRECTION";
  }

  if (
    riskLevel === "CRITICAL" ||
    riskLevel === "HIGH" ||
    trustScore < 65 ||
    signals.anomalies.length
  ) {
    return "MANUAL_REVIEW";
  }

  return trustScore >= 85
    ? "APPROVE"
    : "MANUAL_REVIEW";
}

function deterministicBrief(
  context: ReviewContext
): RegistrationAiReviewBrief {
  const signals = buildDeterministicSignals(context);
  const action = chooseDeterministicAction(
    context,
    signals
  );
  const trustScore = clampScore(context.trust.overallTrust);
  const confidence = Math.max(
    40,
    Math.min(
      95,
      Math.round(
        (
          trustScore +
          clampScore(context.trust.evidenceTrust) +
          clampScore(context.trust.captureIntegrityTrust)
        ) / 3
      )
    )
  );

  return {
    version: "registration_ai_review_brief_v1",
    advisoryOnly: true,
    source: "deterministic_fallback",
    summary:
      action === "APPROVE"
        ? "The available registration facts are broadly consistent and suitable for administrator approval after visual evidence review."
        : action === "REQUEST_CORRECTION"
          ? "The registration contains missing, weak or inconsistent evidence that should be corrected before approval."
          : "The registration contains facts that require careful human review before any decision.",
    overallConfidence: confidence,
    recommendedAction: action,
    positiveSignals: signals.positiveSignals,
    concerns: signals.concerns,
    missingEvidence: signals.missingEvidence,
    anomalies: signals.anomalies,
    reviewFocus: signals.reviewFocus,
    explanation:
      "The recommendation was generated from stored trust scores, document-verification facts, evidence metadata and review history. No registration state was changed.",
    generatedAt: new Date().toISOString(),
    model: null,
    factsUsed: {
      registrationStatus:
        cleanString(
          context.profile.registration_verification_status
        ) || "unknown",
      trustScore,
      riskLevel:
        cleanString(context.trust.riskLevel) || "unknown",
      evidenceCount: context.evidence.length,
      documentCount: context.documentResults.length,
      decisionEventCount: context.decisionEvents.length,
    },
    humanAuthorityNotice: HUMAN_NOTICE,
  };
}

function extractOutputText(data: unknown) {
  const payload =
    data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload.output)
    ? payload.output
    : [];
  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;

    const content = Array.isArray(
      (item as Record<string, unknown>).content
    )
      ? (item as Record<string, unknown>).content as unknown[]
      : [];

    for (const chunk of content) {
      if (
        chunk &&
        typeof chunk === "object" &&
        typeof (chunk as Record<string, unknown>).text === "string"
      ) {
        parts.push(
          (chunk as Record<string, unknown>).text as string
        );
      }
    }
  }

  return parts.join("\n").trim();
}

function parseJsonLoose(text: string) {
  try {
    return JSON.parse(text);
  } catch {}

  const match = text.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function sanitizeAiBrief(
  value: unknown,
  fallback: RegistrationAiReviewBrief,
  model: string
): RegistrationAiReviewBrief {
  const data =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};
  const action = cleanString(
    data.recommendedAction
  ).toUpperCase();
  const recommendedAction:
    RegistrationAiRecommendedAction =
      action === "APPROVE" ||
      action === "REQUEST_CORRECTION" ||
      action === "MANUAL_REVIEW"
        ? action
        : fallback.recommendedAction;

  return {
    ...fallback,
    source: "openai_assisted",
    summary: cleanString(data.summary) || fallback.summary,
    overallConfidence:
      clampScore(data.overallConfidence) ||
      fallback.overallConfidence,
    recommendedAction,
    positiveSignals:
      stringArray(data.positiveSignals).length
        ? stringArray(data.positiveSignals)
        : fallback.positiveSignals,
    concerns:
      stringArray(data.concerns).length
        ? stringArray(data.concerns)
        : fallback.concerns,
    missingEvidence:
      stringArray(data.missingEvidence).length
        ? stringArray(data.missingEvidence)
        : fallback.missingEvidence,
    anomalies:
      stringArray(data.anomalies).length
        ? stringArray(data.anomalies)
        : fallback.anomalies,
    reviewFocus:
      stringArray(data.reviewFocus).length
        ? stringArray(data.reviewFocus)
        : fallback.reviewFocus,
    explanation:
      cleanString(data.explanation) ||
      fallback.explanation,
    generatedAt: new Date().toISOString(),
    model,
    humanAuthorityNotice: HUMAN_NOTICE,
  };
}

function safePromptContext(
  context: ReviewContext,
  fallback: RegistrationAiReviewBrief
) {
  return {
    profile: {
      role: context.profile.role,
      requestedRole: context.profile.requested_role,
      registrationStatus:
        context.profile.registration_verification_status,
      registrationScore:
        context.profile.registration_verification_score,
      approvalStatus: context.profile.approval_status,
      dashboardStatus:
        context.profile.dashboard_activation_status,
    },
    business: {
      businessName: context.business.business_name,
      businessType: context.business.business_type,
      natureOfBusiness:
        context.business.nature_of_business,
      state: context.business.state,
      district: context.business.district,
      locationStatus:
        context.business.location_verification_status,
      selfieStatus:
        context.business.selfie_capture_status,
      workplaceStatus:
        context.business.workplace_evidence_status,
    },
    trust: context.trust,
    evidenceMetadata: context.evidence.map(
      (asset) => ({
        category: asset.evidenceCategory,
        mimeType: asset.mimeType,
        captureSource: asset.captureSource,
        captureTimestamp: asset.captureTimestamp,
        serverReceivedAt: asset.serverReceivedAt,
        hasSha256: Boolean(asset.sha256),
        hasEvidenceBinding: Boolean(
          asset.evidenceBindingSha256
        ),
        captureMetadata:
          asset.captureMetadata || null,
      })
    ),
    documentResults: context.documentResults.map(
      (document) => ({
        label: document.label,
        documentType: document.documentType,
        status: document.status,
        confidence: document.confidence,
        matched: document.matched,
        documentExpired: document.documentExpired,
        businessNameMatched:
          document.businessNameMatched,
        addressMatched: document.addressMatched,
        warnings: document.warnings,
        fieldReviews: document.fieldReviews,
      })
    ),
    existingDeterministicBrief: fallback,
  };
}

async function requestOpenAiBrief(
  context: ReviewContext,
  fallback: RegistrationAiReviewBrief
) {
  const key = process.env.OPENAI_API_KEY;

  if (!key) return fallback;

  const model =
    process.env.OPENAI_REGISTRATION_REVIEW_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "You are an advisory registration-review assistant for 3Bigha. Use only supplied structured facts. Do not invent observations. Do not approve, reject, activate dashboards, modify subscriptions or claim authority. Return strict JSON only with keys summary, overallConfidence, recommendedAction, positiveSignals, concerns, missingEvidence, anomalies, reviewFocus and explanation. recommendedAction must be APPROVE, REQUEST_CORRECTION or MANUAL_REVIEW. Every concern and anomaly must be tied to an observable supplied fact. The final human administrator remains authoritative.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify(
                  safePromptContext(context, fallback)
                ),
              },
            ],
          },
        ],
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `OpenAI review brief failed with status ${response.status}.`
    );
  }

  const data = await response.json();
  const parsed = parseJsonLoose(
    extractOutputText(data)
  );

  if (!parsed) {
    throw new Error(
      "OpenAI review brief did not return valid JSON."
    );
  }

  return sanitizeAiBrief(parsed, fallback, model);
}

export async function loadRegistrationReviewContext(
  admin: SupabaseClient,
  userId: string,
  caseId?: string | null
): Promise<ReviewContext> {
  const [profileRes, businessRes, caseRes, eventsRes] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          [
            "id",
            "role",
            "requested_role",
            "approval_status",
            "dashboard_activation_status",
            "registration_verification_status",
            "registration_verification_score",
            "registration_verification_reasons",
            "admin_review_reason",
          ].join(",")
        )
        .eq("id", userId)
        .maybeSingle(),
      admin
        .from("business_profiles")
        .select(
          [
            "user_id",
            "business_name",
            "business_type",
            "nature_of_business",
            "state",
            "district",
            "location_verification_status",
            "selfie_capture_status",
            "workplace_evidence_status",
            "selfie_media_json",
            "workplace_media_json",
            "business_media_json",
            "automated_verification_json",
            "vendor_document_verification_json",
          ].join(",")
        )
        .eq("user_id", userId)
        .maybeSingle(),
      caseId
        ? admin
            .from("registration_verification_cases")
            .select(
              "id,user_id,status,confidence,result_json,created_at"
            )
            .eq("id", caseId)
            .eq("user_id", userId)
            .maybeSingle()
        : admin
            .from("registration_verification_cases")
            .select(
              "id,user_id,status,confidence,result_json,created_at"
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
      admin
        .from("registration_verification_events")
        .select(
          "id,event_type,previous_status,next_status,score,reasons,evidence_snapshot,decision_source,decided_by,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error(
      "Registration profile could not be loaded."
    );
  }

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

  if (eventsRes.error) {
    throw new Error(
      "Verification history could not be loaded."
    );
  }

  const profile =
    profileRes.data as unknown as Record<string, unknown>;
  const business =
    businessRes.data as unknown as Record<string, unknown>;
  const verificationCase =
    (caseRes.data || {}) as unknown as Record<
      string,
      unknown
    >;
  const automated =
    business.automated_verification_json &&
    typeof business.automated_verification_json === "object"
      ? business.automated_verification_json as Record<string, unknown>
      : {};
  const trust =
    automated.trustIntelligence &&
    typeof automated.trustIntelligence === "object"
      ? automated.trustIntelligence as Record<string, unknown>
      : {};

  return {
    userId,
    caseId:
      cleanString(verificationCase.id) ||
      caseId ||
      null,
    profile,
    business,
    verificationCase,
    decisionEvents: objectArray(eventsRes.data),
    evidence: collectEvidence(business),
    documentResults: collectDocumentResults(
      verificationCase,
      business
    ),
    trust,
  };
}

export async function generateRegistrationAiReviewBrief(
  admin: SupabaseClient,
  userId: string,
  caseId?: string | null
): Promise<RegistrationAiReviewBrief> {
  const context =
    await loadRegistrationReviewContext(
      admin,
      userId,
      caseId
    );
  const fallback = deterministicBrief(context);

  try {
    return await requestOpenAiBrief(
      context,
      fallback
    );
  } catch (error) {
    console.error(
      "REGISTRATION_AI_REVIEW_BRIEF_FALLBACK",
      {
        userId,
        caseId: context.caseId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown AI review brief error",
      }
    );

    return fallback;
  }
}

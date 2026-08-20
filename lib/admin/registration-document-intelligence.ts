import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "registration-evidence";
const SIGNED_URL_TTL_SECONDS = 300;

export type RegistrationDocumentIntelligenceResult = {
  id: string;
  userId: string;
  caseId: string | null;
  evidencePath: string;
  evidenceSha256: string;
  evidenceBindingSha256: string | null;
  documentType: string;
  classificationConfidence: number;
  extractionConfidence: number;
  extractedFields: Record<string, unknown>;
  warnings: string[];
  anomalies: string[];
  status: "completed" | "needs_manual_review";
  source: string;
  model: string | null;
  createdAt: string;
};

type EvidenceAsset = {
  bucket?: string;
  path?: string;
  name?: string;
  mimeType?: string;
  sha256?: string;
  evidenceBindingSha256?: string;
  evidenceCategory?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function clamp(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean).slice(0, 20)
    : [];
}

function assets(value: unknown): EvidenceAsset[] {
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

function normalizeResult(
  value: unknown,
  model: string
) {
  const data =
    value && typeof value === "object"
      ? value as Record<string, unknown>
      : {};

  const extractedFields =
    data.extractedFields &&
    typeof data.extractedFields === "object" &&
    !Array.isArray(data.extractedFields)
      ? data.extractedFields as Record<string, unknown>
      : {};

  const classificationConfidence = clamp(
    data.classificationConfidence
  );
  const extractionConfidence = clamp(
    data.extractionConfidence
  );
  const warnings = strings(data.warnings);
  const anomalies = strings(data.anomalies);

  return {
    documentType:
      clean(data.documentType) || "unknown",
    classificationConfidence,
    extractionConfidence,
    extractedFields,
    warnings,
    anomalies,
    rawModelResult: data,
    status:
      extractionConfidence >= 70 &&
      classificationConfidence >= 70 &&
      !anomalies.length
        ? "completed" as const
        : "needs_manual_review" as const,
    source:
      "openai_document_intelligence_v1",
    model,
  };
}

async function loadOwnedDocument(
  admin: SupabaseClient,
  userId: string,
  evidencePath: string
) {
  const { data, error } = await admin
    .from("business_profiles")
    .select(
      "user_id,business_media_json"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Business registration could not be loaded."
    );
  }

  const owned = assets(
    (data as unknown as Record<string, unknown>)
      .business_media_json
  ).find(
    (asset) =>
      asset.bucket === BUCKET &&
      clean(asset.path) === evidencePath &&
      asset.evidenceCategory ===
        "business_document"
  );

  if (!owned) {
    throw new Error(
      "The selected private document is not attached to this registration."
    );
  }

  if (!clean(owned.sha256)) {
    throw new Error(
      "The selected document is missing its integrity hash."
    );
  }

  return owned;
}

async function callDocumentModel(
  signedUrl: string,
  asset: EvidenceAsset
) {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  const model =
    process.env.OPENAI_REGISTRATION_DOCUMENT_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";

  const mimeType = clean(asset.mimeType).toLowerCase();
  const isPdf = mimeType === "application/pdf";

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
        temperature: 0,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "Extract structured facts from this Indian business registration document. Use only visible document content. Return strict JSON with keys documentType, classificationConfidence, extractionConfidence, extractedFields, warnings, anomalies. documentType should be one of gst, trade_license, udyam, pan, fssai, shop_establishment, professional_registration, company_registration, partnership_document, other, unknown. extractedFields may include businessName, proprietorName, registrationNumber, pan, gstin, issuingAuthority, issueDate, validUntil, noExpiry, address, state, district, pincode, constitution, activity, financialPeriod. Confidence values must be integers 0-100. Do not approve or reject the registration.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Read the attached private registration document and extract only supported facts.",
              },
              isPdf
                ? {
                    type: "input_file",
                    file_url: signedUrl,
                  }
                : {
                    type: "input_image",
                    image_url: signedUrl,
                    detail: "high",
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
      `Document extraction failed with status ${response.status}.`
    );
  }

  const payload = await response.json();
  const parsed = parseJsonLoose(
    extractOutputText(payload)
  );

  if (!parsed) {
    throw new Error(
      "Document extraction did not return valid JSON."
    );
  }

  return normalizeResult(parsed, model);
}

export async function generateRegistrationDocumentIntelligence(
  admin: SupabaseClient,
  input: {
    reviewerId: string;
    userId: string;
    caseId?: string | null;
    evidencePath: string;
  }
): Promise<RegistrationDocumentIntelligenceResult> {
  const asset = await loadOwnedDocument(
    admin,
    input.userId,
    input.evidencePath
  );

  const evidenceSha256 = clean(asset.sha256);

  const { data: existing } = await admin
    .from("registration_document_intelligence")
    .select("*")
    .eq("user_id", input.userId)
    .eq("evidence_sha256", evidenceSha256)
    .maybeSingle();

  if (existing) {
    const row = existing as unknown as Record<
      string,
      unknown
    >;

    return {
      id: clean(row.id),
      userId: clean(row.user_id),
      caseId: clean(row.case_id) || null,
      evidencePath: clean(row.evidence_path),
      evidenceSha256:
        clean(row.evidence_sha256),
      evidenceBindingSha256:
        clean(row.evidence_binding_sha256) ||
        null,
      documentType: clean(row.document_type),
      classificationConfidence: clamp(
        row.classification_confidence
      ),
      extractionConfidence: clamp(
        row.extraction_confidence
      ),
      extractedFields:
        row.extracted_fields &&
        typeof row.extracted_fields === "object"
          ? row.extracted_fields as Record<
              string,
              unknown
            >
          : {},
      warnings: strings(row.warnings),
      anomalies: strings(row.anomalies),
      status:
        row.status === "completed"
          ? "completed"
          : "needs_manual_review",
      source: clean(row.source),
      model: clean(row.model) || null,
      createdAt: clean(row.created_at),
    };
  }

  const { data: signed, error: signedError } =
    await admin.storage
      .from(BUCKET)
      .createSignedUrl(
        input.evidencePath,
        SIGNED_URL_TTL_SECONDS
      );

  if (signedError || !signed?.signedUrl) {
    throw new Error(
      "A secure document-analysis link could not be created."
    );
  }

  const extraction = await callDocumentModel(
    signed.signedUrl,
    asset
  );

  const { data: inserted, error } = await admin
    .from("registration_document_intelligence")
    .insert({
      user_id: input.userId,
      case_id: input.caseId || null,
      evidence_bucket: BUCKET,
      evidence_path: input.evidencePath,
      evidence_sha256: evidenceSha256,
      evidence_binding_sha256:
        clean(asset.evidenceBindingSha256) ||
        null,
      document_type: extraction.documentType,
      classification_confidence:
        extraction.classificationConfidence,
      extraction_confidence:
        extraction.extractionConfidence,
      extracted_fields:
        extraction.extractedFields,
      warnings: extraction.warnings,
      anomalies: extraction.anomalies,
      raw_model_result:
        extraction.rawModelResult,
      source: extraction.source,
      model: extraction.model,
      status: extraction.status,
      created_by: input.reviewerId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(
      "Document intelligence could not be stored."
    );
  }

  const row = inserted as unknown as Record<
    string,
    unknown
  >;

  return {
    id: clean(row.id),
    userId: clean(row.user_id),
    caseId: clean(row.case_id) || null,
    evidencePath: clean(row.evidence_path),
    evidenceSha256: clean(row.evidence_sha256),
    evidenceBindingSha256:
      clean(row.evidence_binding_sha256) ||
      null,
    documentType: clean(row.document_type),
    classificationConfidence: clamp(
      row.classification_confidence
    ),
    extractionConfidence: clamp(
      row.extraction_confidence
    ),
    extractedFields:
      row.extracted_fields &&
      typeof row.extracted_fields === "object"
        ? row.extracted_fields as Record<
            string,
            unknown
          >
        : {},
    warnings: strings(row.warnings),
    anomalies: strings(row.anomalies),
    status:
      row.status === "completed"
        ? "completed"
        : "needs_manual_review",
    source: clean(row.source),
    model: clean(row.model) || null,
    createdAt: clean(row.created_at),
  };
}

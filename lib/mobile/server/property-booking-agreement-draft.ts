import "server-only";

import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const SIGNED_SOURCE_URL_TTL_SECONDS = 600;
const OPENAI_TIMEOUT_MS = 120_000;

type UnknownRecord = Record<string, unknown>;

type RpcResult<T> = {
  data: T | null;
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
};

type StorageSignedUrlResult = {
  data: {
    signedUrl?: string;
    signedURL?: string;
  } | null;
  error: {
    message?: string;
  } | null;
};

type TrustedAdminClient = {
  rpc(
    functionName: string,
    parameters?: UnknownRecord,
  ): Promise<RpcResult<unknown>>;
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
      ): Promise<StorageSignedUrlResult>;
    };
  };
};

type PreparedDraft = {
  draftId: string;
  readinessId: string;
  status: string;
  promptVersion: string;
  sourceSnapshotSha256: string;
  replayed: boolean;
};

type ConfidentialSourceDescriptor = {
  documentId: string;
  sourceKey: string | null;
  sha256: string;
};

type ClaimedGeneration = {
  draftId: string;
  readinessId: string;
  applicationId: string;
  unitId: string;
  projectId: string;
  version: number;
  status: string;
  promptVersion: string;
  sourceSnapshotSha256: string;
  generationStartedAt: string | null;
  replayed: boolean;
  sourcePackage: {
    canonicalPropertySchedule: UnknownRecord;
    buyerConfirmedParticulars: UnknownRecord;
    ownerConfirmedParticulars: UnknownRecord;
    confidentialLegalDocuments: ConfidentialSourceDescriptor[];
  };
};

type OpenedSource = {
  draftId: string;
  documentId: string;
  storageBucket: string;
  storagePath: string;
  sha256: string;
  aiRequestReference: string;
  includedAt: string | null;
  replayed: boolean;
};

type GeneratedDraft = {
  draftContent: {
    documentTitle: string;
    advisoryNotice: string;
    advisoryOnly: true;
    lawyerReviewRequired: true;
    parties: UnknownRecord;
    propertySchedule: UnknownRecord;
    financialTerms: UnknownRecord;
    clauses: unknown[];
    lawyerReview: UnknownRecord;
    [key: string]: unknown;
  };
  printableText: string;
};

export type GeneratePropertyAgreementAdvisoryDraftInput = {
  actorUserId: string;
  readinessId: string;
};

export type GeneratePropertyAgreementAdvisoryDraftResult = {
  draftId: string;
  readinessId: string;
  status: string;
  readinessStatus: string;
  version: number;
  promptVersion: string;
  draftFormat: string;
  draftContentSha256: string;
  generatedAt: string | null;
  advisoryOnly: true;
  lawyerReviewRequired: true;
  legalEffectCreated: false;
  signingAllowed: false;
  registrationAllowed: false;
  executionAllowed: false;
  createsPayment: false;
  marksInventorySold: false;
  transfersTitle: false;
  transfersOwnership: false;
  replayed: boolean;
};

export class PropertyAgreementDraftWorkerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 500) {
    super(message);
    this.name = "PropertyAgreementDraftWorkerError";
    this.code = code;
    this.status = status;
  }
}

function record(value: unknown): UnknownRecord | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as UnknownRecord;
}

function requiredString(
  value: unknown,
  code: string,
  maximumLength = 1_000_000,
): string {
  if (typeof value !== "string") {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A required trusted-worker value is missing.",
    );
  }

  const normalized = value.trim();

  if (
    normalized.length < 1 ||
    normalized.length > maximumLength
  ) {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A trusted-worker value is outside its permitted length.",
    );
  }

  return normalized;
}

function requiredUuid(value: unknown, code: string): string {
  const normalized = requiredString(value, code, 100).toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalized,
    )
  ) {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A trusted-worker identifier is invalid.",
      400,
    );
  }

  return normalized;
}

function requiredSha256(value: unknown, code: string): string {
  const normalized = requiredString(value, code, 64).toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A trusted-worker SHA-256 value is invalid.",
    );
  }

  return normalized;
}

function optionalString(
  value: unknown,
  maximumLength = 1_000,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.length < 1 ||
    normalized.length > maximumLength
  ) {
    return null;
  }

  return normalized;
}

function requiredBoolean(value: unknown, code: string): boolean {
  if (typeof value !== "boolean") {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A trusted-worker boolean value is invalid.",
    );
  }

  return value;
}

function requiredInteger(value: unknown, code: string): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value)
  ) {
    throw new PropertyAgreementDraftWorkerError(
      code,
      "A trusted-worker integer value is invalid.",
    );
  }

  return value;
}

function adminClient(): TrustedAdminClient {
  return getSupabaseAdmin() as unknown as TrustedAdminClient;
}

async function callRpc<T>(
  functionName: string,
  parameters: UnknownRecord,
): Promise<T> {
  const result = await adminClient().rpc(
    functionName,
    parameters,
  );

  if (result.error) {
    const databaseCode =
      optionalString(result.error.code, 100) ??
      optionalString(result.error.message, 200) ??
      "AGREEMENT_DRAFT_DATABASE_ERROR";

    throw new PropertyAgreementDraftWorkerError(
      databaseCode,
      "The canonical agreement-draft authority rejected the operation.",
    );
  }

  if (result.data === null || result.data === undefined) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DRAFT_DATABASE_RESPONSE_INVALID",
      "The canonical agreement-draft authority returned no result.",
    );
  }

  return result.data as T;
}

function parsePreparedDraft(value: unknown): PreparedDraft {
  const row = record(value);

  if (!row) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
      "The preparation authority returned an invalid result.",
    );
  }

  return {
    draftId: requiredUuid(
      row.draftId,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
    ),
    readinessId: requiredUuid(
      row.readinessId,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
    ),
    status: requiredString(
      row.status,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
      100,
    ),
    promptVersion: requiredString(
      row.promptVersion,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
      200,
    ),
    sourceSnapshotSha256: requiredSha256(
      row.sourceSnapshotSha256,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
    ),
    replayed: requiredBoolean(
      row.replayed,
      "AGREEMENT_DRAFT_PREPARATION_RESPONSE_INVALID",
    ),
  };
}

function parseConfidentialSource(
  value: unknown,
): ConfidentialSourceDescriptor {
  const row = record(value);

  if (!row) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_GENERATION_SOURCE_PACKAGE_INVALID",
      "A confidential source descriptor is invalid.",
    );
  }

  return {
    documentId: requiredUuid(
      row.documentId,
      "AGREEMENT_GENERATION_SOURCE_PACKAGE_INVALID",
    ),
    sourceKey: optionalString(row.sourceKey, 500),
    sha256: requiredSha256(
      row.sha256,
      "AGREEMENT_GENERATION_SOURCE_PACKAGE_INVALID",
    ),
  };
}

function parseClaimedGeneration(value: unknown): ClaimedGeneration {
  const row = record(value);
  const sourcePackage = row ? record(row.sourcePackage) : null;

  if (!row || !sourcePackage) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
      "The generation claim returned an invalid source package.",
    );
  }

  const schedule = record(sourcePackage.canonicalPropertySchedule);
  const buyer = record(sourcePackage.buyerConfirmedParticulars);
  const owner = record(sourcePackage.ownerConfirmedParticulars);

  if (!schedule || !buyer || !owner) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_GENERATION_SOURCE_PACKAGE_INVALID",
      "Canonical agreement sources are missing.",
    );
  }

  const confidential = Array.isArray(
    sourcePackage.confidentialLegalDocuments,
  )
    ? sourcePackage.confidentialLegalDocuments.map(
        parseConfidentialSource,
      )
    : [];

  return {
    draftId: requiredUuid(
      row.draftId,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    readinessId: requiredUuid(
      row.readinessId,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    applicationId: requiredUuid(
      row.applicationId,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    unitId: requiredUuid(
      row.unitId,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    projectId: requiredUuid(
      row.projectId,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    version: requiredInteger(
      row.version,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    status: requiredString(
      row.status,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
      100,
    ),
    promptVersion: requiredString(
      row.promptVersion,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
      200,
    ),
    sourceSnapshotSha256: requiredSha256(
      row.sourceSnapshotSha256,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    generationStartedAt:
      optionalString(row.generationStartedAt, 100),
    replayed: requiredBoolean(
      row.replayed,
      "AGREEMENT_GENERATION_CLAIM_RESPONSE_INVALID",
    ),
    sourcePackage: {
      canonicalPropertySchedule: schedule,
      buyerConfirmedParticulars: buyer,
      ownerConfirmedParticulars: owner,
      confidentialLegalDocuments: confidential,
    },
  };
}

function parseOpenedSource(value: unknown): OpenedSource {
  const row = record(value);

  if (!row) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
      "The document-access authority returned an invalid result.",
    );
  }

  return {
    draftId: requiredUuid(
      row.draftId,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
    ),
    documentId: requiredUuid(
      row.documentId,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
    ),
    storageBucket: requiredString(
      row.storageBucket,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
      200,
    ),
    storagePath: requiredString(
      row.storagePath,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
      2_000,
    ),
    sha256: requiredSha256(
      row.sha256,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
    ),
    aiRequestReference: requiredString(
      row.aiRequestReference,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
      200,
    ),
    includedAt: optionalString(row.includedAt, 100),
    replayed: requiredBoolean(
      row.replayed,
      "AGREEMENT_DOCUMENT_ACCESS_RESPONSE_INVALID",
    ),
  };
}

async function createPrivateSignedUrl(
  source: OpenedSource,
): Promise<string> {
  if (source.storageBucket !== "property-documents-private") {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DOCUMENT_STORAGE_INVALID",
      "The confidential source is not stored in the canonical private bucket.",
    );
  }

  const result = await adminClient()
    .storage
    .from(source.storageBucket)
    .createSignedUrl(
      source.storagePath,
      SIGNED_SOURCE_URL_TTL_SECONDS,
    );

  if (result.error) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DOCUMENT_SIGNED_URL_FAILED",
      "A short-lived confidential source URL could not be created.",
    );
  }

  const signedUrl =
    optionalString(result.data?.signedUrl, 10_000) ??
    optionalString(result.data?.signedURL, 10_000);

  if (!signedUrl) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DOCUMENT_SIGNED_URL_INVALID",
      "The private storage service returned no signed source URL.",
    );
  }

  return signedUrl;
}

function responseOutputText(value: unknown): string {
  const response = record(value);

  if (!response) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_AI_RESPONSE_INVALID",
      "The AI provider returned an invalid response.",
    );
  }

  const direct = optionalString(response.output_text, 2_000_000);

  if (direct) {
    return direct;
  }

  if (!Array.isArray(response.output)) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_AI_RESPONSE_INVALID",
      "The AI provider returned no structured output.",
    );
  }

  const fragments: string[] = [];

  for (const outputItem of response.output) {
    const item = record(outputItem);

    if (!item || !Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      const content = record(contentItem);

      if (!content) {
        continue;
      }

      const text =
        optionalString(content.text, 2_000_000) ??
        optionalString(content.output_text, 2_000_000);

      if (text) {
        fragments.push(text);
      }
    }
  }

  const combined = fragments.join("\n").trim();

  if (!combined) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_AI_RESPONSE_INVALID",
      "The AI provider returned no usable output text.",
    );
  }

  return combined;
}

function parseGeneratedDraft(value: unknown): GeneratedDraft {
  const root = record(value);
  const draftContent = root ? record(root.draftContent) : null;

  if (!root || !draftContent) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_AI_DRAFT_STRUCTURE_INVALID",
      "The AI response does not contain a structured advisory draft.",
    );
  }

  const documentTitle = requiredString(
    draftContent.documentTitle,
    "AGREEMENT_AI_DRAFT_STRUCTURE_INVALID",
    500,
  );

  const advisoryNotice = requiredString(
    draftContent.advisoryNotice,
    "AGREEMENT_AI_DRAFT_STRUCTURE_INVALID",
    2_000,
  );

  if (
    draftContent.advisoryOnly !== true ||
    draftContent.lawyerReviewRequired !== true ||
    !record(draftContent.parties) ||
    !record(draftContent.propertySchedule) ||
    !record(draftContent.financialTerms) ||
    !record(draftContent.lawyerReview) ||
    !Array.isArray(draftContent.clauses) ||
    draftContent.clauses.length < 1
  ) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_AI_DRAFT_POLICY_INVALID",
      "The AI output violates the advisory-only draft contract.",
    );
  }

  const printableText = requiredString(
    root.printableText,
    "AGREEMENT_AI_PRINTABLE_TEXT_INVALID",
    250_000,
  );

  return {
    draftContent: {
      ...draftContent,
      documentTitle,
      advisoryNotice,
      advisoryOnly: true,
      lawyerReviewRequired: true,
      parties: draftContent.parties as UnknownRecord,
      propertySchedule:
        draftContent.propertySchedule as UnknownRecord,
      financialTerms:
        draftContent.financialTerms as UnknownRecord,
      clauses: draftContent.clauses,
      lawyerReview: draftContent.lawyerReview as UnknownRecord,
    },
    printableText,
  };
}

async function requestAdvisoryDraft(input: {
  apiKey: string;
  model: string;
  requestReference: string;
  claim: ClaimedGeneration;
  signedSources: Array<{
    documentId: string;
    sha256: string;
    signedUrl: string;
  }>;
}): Promise<GeneratedDraft> {
  const instructions = [
    "You are preparing a private Indian property agreement advisory draft.",
    "The output is advisory only and has no legal effect.",
    "A qualified lawyer must review and approve every clause.",
    "Never state that payment, title transfer, registration, signing, possession or sale has occurred.",
    "Use only the supplied canonical schedule, confirmed party particulars and confidential legal sources.",
    "Do not invent identity numbers, deed facts, boundaries, prices, dates or legal conclusions.",
    "Preserve masked identity references exactly as supplied.",
    "Return only the requested JSON structure.",
  ].join(" ");

  const sourceSummary = {
    promptVersion: input.claim.promptVersion,
    sourceSnapshotSha256: input.claim.sourceSnapshotSha256,
    canonicalPropertySchedule:
      input.claim.sourcePackage.canonicalPropertySchedule,
    buyerConfirmedParticulars:
      input.claim.sourcePackage.buyerConfirmedParticulars,
    ownerConfirmedParticulars:
      input.claim.sourcePackage.ownerConfirmedParticulars,
    confidentialSourceManifest: input.signedSources.map(
      (source) => ({
        documentId: source.documentId,
        sha256: source.sha256,
      }),
    ),
  };

  const content: UnknownRecord[] = [
    {
      type: "input_text",
      text:
        "Prepare the private advisory agreement draft from this canonical source package:\n" +
        JSON.stringify(sourceSummary),
    },
  ];

  for (const source of input.signedSources) {
    content.push({
      type: "input_file",
      file_url: source.signedUrl,
    });
  }

  const payload = {
    model: input.model,
    store: false,
    instructions,
    input: [
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "property_agreement_advisory_draft",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["draftContent", "printableText"],
          properties: {
            draftContent: {
              type: "object",
              additionalProperties: false,
              required: [
                "documentTitle",
                "advisoryNotice",
                "advisoryOnly",
                "lawyerReviewRequired",
                "parties",
                "propertySchedule",
                "financialTerms",
                "clauses",
                "lawyerReview",
              ],
              properties: {
                documentTitle: { type: "string" },
                advisoryNotice: { type: "string" },
                advisoryOnly: { type: "boolean", const: true },
                lawyerReviewRequired: {
                  type: "boolean",
                  const: true,
                },
                parties: {
                  type: "object",
                  additionalProperties: true,
                },
                propertySchedule: {
                  type: "object",
                  additionalProperties: true,
                },
                financialTerms: {
                  type: "object",
                  additionalProperties: true,
                },
                clauses: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
                lawyerReview: {
                  type: "object",
                  additionalProperties: true,
                },
              },
            },
            printableText: { type: "string" },
          },
        },
      },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    OPENAI_TIMEOUT_MS,
  );

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + input.apiKey,
        "Content-Type": "application/json",
        "X-Client-Request-Id": input.requestReference,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new PropertyAgreementDraftWorkerError(
        "AGREEMENT_AI_REQUEST_FAILED",
        "The advisory-draft AI request failed.",
        502,
      );
    }

    const outputText = responseOutputText(responseBody);

    let parsed: unknown;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new PropertyAgreementDraftWorkerError(
        "AGREEMENT_AI_RESPONSE_JSON_INVALID",
        "The advisory-draft AI response is not valid JSON.",
        502,
      );
    }

    return parseGeneratedDraft(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

function failureCode(error: unknown): string {
  if (error instanceof PropertyAgreementDraftWorkerError) {
    const normalized = error.code
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, "_")
      .slice(0, 80);

    if (/^[A-Z0-9_]{3,80}$/.test(normalized)) {
      return normalized;
    }
  }

  if (error instanceof Error && error.name === "AbortError") {
    return "AGREEMENT_AI_REQUEST_TIMEOUT";
  }

  return "AGREEMENT_AI_GENERATION_FAILED";
}

async function recordGenerationFailure(input: {
  draftId: string;
  requestReference: string;
  code: string;
}): Promise<void> {
  try {
    await callRpc<unknown>(
      "fail_property_unit_booking_agreement_advisory_generation",
      {
        target_draft_id: input.draftId,
        target_ai_request_reference: input.requestReference,
        target_failure_code: input.code,
      },
    );
  } catch {
    /*
     * Never replace the original worker failure with a secondary
     * reconciliation failure. Operational monitoring must investigate it.
     */
  }
}

export async function generatePropertyBookingAgreementAdvisoryDraft(
  input: GeneratePropertyAgreementAdvisoryDraftInput,
): Promise<GeneratePropertyAgreementAdvisoryDraftResult> {
  const actorUserId = requiredUuid(
    input.actorUserId,
    "AGREEMENT_ACTOR_INVALID",
  );

  const readinessId = requiredUuid(
    input.readinessId,
    "AGREEMENT_READINESS_INVALID",
  );

  const apiKey = requiredString(
    process.env.OPENAI_API_KEY,
    "OPENAI_API_KEY_MISSING",
    10_000,
  );

  const model =
    optionalString(
      process.env.OPENAI_PROPERTY_AGREEMENT_MODEL,
      200,
    ) ?? DEFAULT_OPENAI_MODEL;

  const prepared = parsePreparedDraft(
    await callRpc<unknown>(
      "prepare_property_unit_booking_agreement_advisory_draft",
      {
        target_actor_user_id: actorUserId,
        target_readiness_id: readinessId,
      },
    ),
  );

  if (prepared.readinessId !== readinessId) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_DRAFT_PREPARATION_BINDING_INVALID",
      "The prepared draft does not belong to the requested readiness workspace.",
    );
  }

  const requestReference = randomUUID();

  const claim = parseClaimedGeneration(
    await callRpc<unknown>(
      "claim_property_unit_booking_agreement_advisory_generation",
      {
        target_draft_id: prepared.draftId,
        target_ai_provider: "openai",
        target_ai_model: model,
        target_ai_request_reference: requestReference,
      },
    ),
  );

  if (
    claim.draftId !== prepared.draftId ||
    claim.readinessId !== prepared.readinessId ||
    claim.promptVersion !== prepared.promptVersion ||
    claim.sourceSnapshotSha256 !==
      prepared.sourceSnapshotSha256
  ) {
    throw new PropertyAgreementDraftWorkerError(
      "AGREEMENT_GENERATION_CLAIM_BINDING_INVALID",
      "The claimed generation does not match its prepared source snapshot.",
    );
  }

  try {
    const signedSources: Array<{
      documentId: string;
      sha256: string;
      signedUrl: string;
    }> = [];

    for (
      const descriptor of
      claim.sourcePackage.confidentialLegalDocuments
    ) {
      const opened = parseOpenedSource(
        await callRpc<unknown>(
          "open_property_unit_booking_agreement_generation_source",
          {
            target_draft_id: claim.draftId,
            target_document_id: descriptor.documentId,
            target_ai_request_reference: requestReference,
          },
        ),
      );

      if (
        opened.draftId !== claim.draftId ||
        opened.documentId !== descriptor.documentId ||
        opened.sha256 !== descriptor.sha256 ||
        opened.aiRequestReference !== requestReference
      ) {
        throw new PropertyAgreementDraftWorkerError(
          "AGREEMENT_DOCUMENT_SOURCE_BINDING_INVALID",
          "A confidential source does not match the canonical source manifest.",
        );
      }

      signedSources.push({
        documentId: opened.documentId,
        sha256: opened.sha256,
        signedUrl: await createPrivateSignedUrl(opened),
      });
    }

    const generated = await requestAdvisoryDraft({
      apiKey,
      model,
      requestReference,
      claim,
      signedSources,
    });

    const databaseHash = requiredSha256(
      await callRpc<unknown>(
        "hash_property_unit_booking_agreement_advisory_content",
        {
          target_draft_content: generated.draftContent,
          target_printable_text: generated.printableText,
        },
      ),
      "AGREEMENT_DRAFT_HASH_RESPONSE_INVALID",
    );

    return await callRpc<GeneratePropertyAgreementAdvisoryDraftResult>(
      "complete_property_unit_booking_agreement_advisory_generation",
      {
        target_draft_id: claim.draftId,
        target_ai_request_reference: requestReference,
        target_draft_content: generated.draftContent,
        target_printable_text: generated.printableText,
        target_draft_content_sha256: databaseHash,
      },
    );
  } catch (error) {
    await recordGenerationFailure({
      draftId: claim.draftId,
      requestReference,
      code: failureCode(error),
    });

    throw error;
  }
}

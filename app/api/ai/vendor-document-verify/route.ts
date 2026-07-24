import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  validateGstin,
  documentTextContainsNeedle,
} from "@/lib/vendor-verification/gstin";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationDocumentType =
  | "gst"
  | "trade_license"
  | "udyam"
  | "pan"
  | "fssai"
  | "shop_establishment"
  | "professional_registration"
  | "other";

type RegistrationDocumentInput = {
  documentType: RegistrationDocumentType;
  enteredNumber: string;
  label?: string;
  mediaAssets: any[];
};

type DocumentVerificationResult = {
  documentType: RegistrationDocumentType;
  label: string;
  enteredNumber: string;
  extractedNumber: string;
  matched: boolean;
  readable: boolean;
  confidence: number;
  status:
    | "verified_by_ai"
    | "document_mismatch"
    | "format_invalid"
    | "needs_manual_review"
    | "needs_document";
  extractedBusinessName: string;
  extractedAddress: string;
  businessNameMatched: boolean;
  addressMatched: boolean;
  summary: string;
  warnings: string[];
};

const DOCUMENT_LABELS: Record<RegistrationDocumentType, string> = {
  gst: "GST Registration",
  trade_license: "Trade Licence",
  udyam: "UDYAM Registration",
  pan: "PAN",
  fssai: "FSSAI Registration",
  shop_establishment: "Shop & Establishment Registration",
  professional_registration: "Professional Registration",
  other: "Other Legal Registration",
};

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRegistrationNumber(value: unknown) {
  return safeString(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function isSupportedDocumentType(
  value: unknown
): value is RegistrationDocumentType {
  return Object.prototype.hasOwnProperty.call(
    DOCUMENT_LABELS,
    safeString(value)
  );
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;

  const chunks: string[] = [];
  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const chunk of content) {
      if (typeof chunk?.text === "string") chunks.push(chunk.text);
    }
  }

  return chunks.join("\n").trim();
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

function mediaInput(asset: any) {
  const url = safeString(asset?.url);
  if (!url) return null;

  const mimeType = safeString(asset?.mimeType || asset?.mime_type).toLowerCase();
  const kind = safeString(asset?.kind).toLowerCase();
  const name =
    safeString(asset?.name || asset?.file_name) || "business-proof";

  if (
    kind === "document" ||
    mimeType === "application/pdf" ||
    /\.pdf(?:$|\?)/i.test(url)
  ) {
    return {
      type: "input_file",
      file_url: url,
      filename: name.toLowerCase().endsWith(".pdf")
        ? name
        : `${name}.pdf`,
    };
  }

  return {
    type: "input_image",
    image_url: url,
    detail: "high",
  };
}

function legacyDocuments(body: any): RegistrationDocumentInput[] {
  const mediaAssets = Array.isArray(body?.mediaAssets)
    ? body.mediaAssets
    : [];

  const candidates = [
    ["gst", safeString(body?.gstin)],
    ["trade_license", safeString(body?.tradeLicenseNo)],
    ["udyam", safeString(body?.udyamNo)],
    ["pan", safeString(body?.pan)],
  ] as const;

  return candidates
    .filter(([, enteredNumber]) => Boolean(enteredNumber))
    .map(([documentType, enteredNumber]) => ({
      documentType,
      enteredNumber,
      label: DOCUMENT_LABELS[documentType],
      mediaAssets,
    }));
}

function parseDocuments(body: any): RegistrationDocumentInput[] {
  const structured = Array.isArray(body?.documents)
    ? body.documents
    : [];

  const parsed = structured
    .map((item: any): RegistrationDocumentInput | null => {
      if (!isSupportedDocumentType(item?.documentType)) return null;

      const documentType = item.documentType as RegistrationDocumentType;

    return {
      documentType,
      enteredNumber: safeString(item?.enteredNumber),
      label:
        safeString(item?.label) ||
        DOCUMENT_LABELS[documentType],
      mediaAssets: Array.isArray(item?.mediaAssets)
        ? item.mediaAssets
        : [],
    };
    })
    .filter(
      (
        item: RegistrationDocumentInput | null
      ): item is RegistrationDocumentInput => Boolean(item)
    );

  return parsed.length ? parsed : legacyDocuments(body);
}

function emptyResult(
  document: RegistrationDocumentInput,
  overrides: Partial<DocumentVerificationResult> = {}
): DocumentVerificationResult {
  return {
    documentType: document.documentType,
    label:
      document.label || DOCUMENT_LABELS[document.documentType],
    enteredNumber: document.enteredNumber,
    extractedNumber: "",
    matched: false,
    readable: false,
    confidence: 0,
    status: "needs_manual_review",
    extractedBusinessName: "",
    extractedAddress: "",
    businessNameMatched: false,
    addressMatched: false,
    summary: "This document needs manual review.",
    warnings: [],
    ...overrides,
  };
}

function aggregateStatus(results: DocumentVerificationResult[]) {
  if (!results.length) return "needs_document";
  if (results.some((item) => item.status === "format_invalid")) {
    return "format_invalid";
  }
  if (results.some((item) => item.status === "document_mismatch")) {
    return "document_mismatch";
  }
  if (results.every((item) => item.status === "verified_by_ai")) {
    return "verified_by_ai";
  }
  return "needs_manual_review";
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = getSupabaseServerClient(cookieStore);
    const {
      data: { user },
    } = await session.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Login required." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();

    async function verifiedResponse(
      verification: Record<string, unknown>
    ) {
      const { error } = await admin
        .from("registration_verification_cases")
        .insert({
          user_id: user!.id,
          status: String(
            verification.status || "needs_manual_review"
          ),
          confidence: Number(verification.confidence || 0),
          result_json: verification,
        });

      if (error) {
        console.error(
          "REGISTRATION_VERIFICATION_AUDIT_FAILED",
          error
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              "The document check could not be recorded safely.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, verification });
    }

    const body = await req.json();
    const businessName = safeString(body?.businessName);
    const businessAddress = safeString(body?.businessAddress);
    const documents = parseDocuments(body);

    if (!documents.length) {
      return verifiedResponse({
        status: "needs_document",
        confidence: 0,
        documents: [],
        summary:
          "Enter at least one legal registration number and upload its certificate.",
        warnings: ["No legal registration document was supplied."],
      });
    }

    const prechecked: DocumentVerificationResult[] = [];
    const documentsForAi: RegistrationDocumentInput[] = [];

    for (const document of documents) {
      const inputs = document.mediaAssets
        .map(mediaInput)
        .filter(Boolean);

      if (!document.enteredNumber) {
        prechecked.push(
          emptyResult(document, {
            summary:
              "Enter the registration number before checking this certificate.",
            warnings: ["Registration number not provided."],
          })
        );
        continue;
      }

      if (!inputs.length) {
        prechecked.push(
          emptyResult(document, {
            status: "needs_document",
            summary: `Upload the ${document.label} certificate.`,
            warnings: ["No matching certificate was uploaded."],
          })
        );
        continue;
      }

      if (document.documentType === "gst") {
        const validation = validateGstin(document.enteredNumber);
        if (!validation.valid) {
          prechecked.push(
            emptyResult(document, {
              status: "format_invalid",
              confidence: 5,
              summary: "The entered GSTIN format is invalid.",
              warnings: validation.errors,
            })
          );
          continue;
        }
      }

      documentsForAi.push(document);
    }

    const apiKey = getOpenAIKey();

    if (!documentsForAi.length || !apiKey) {
      const results = [
        ...prechecked,
        ...documentsForAi.map((document) =>
          emptyResult(document, {
            confidence:
              document.documentType === "gst" ? 35 : 10,
            summary:
              "The certificate was received, but automated comparison is temporarily unavailable.",
            warnings: [
              "Automated document matching was unavailable.",
            ],
          })
        ),
      ];

      const confidence = results.length
        ? Math.round(
            results.reduce(
              (sum, item) => sum + item.confidence,
              0
            ) / results.length
          )
        : 0;

      return verifiedResponse({
        status: aggregateStatus(results),
        confidence,
        documents: results,
        summary:
          "Legal certificates were recorded. Some checks require manual review.",
        warnings: results.flatMap((item) => item.warnings),
      });
    }

    const manifest = documentsForAi.map(
      (document, index) => ({
        index,
        documentType: document.documentType,
        label:
          document.label ||
          DOCUMENT_LABELS[document.documentType],
        enteredNumber: document.enteredNumber,
      })
    );

    const content: any[] = [
      {
        type: "input_text",
        text: `
You are checking legal business-registration documents for 3bigha.com.

This is an evidence-consistency check, not an official government verification.

Declared business:
Business name: ${businessName || "not provided"}
Business address: ${businessAddress || "not provided"}

Documents, in the same order as the attached files:
${JSON.stringify(manifest, null, 2)}

Return JSON only:
{
  "documents": [
    {
      "index": number,
      "documentType": string,
      "extractedNumber": string,
      "readable": boolean,
      "numberMatched": boolean,
      "extractedBusinessName": string,
      "extractedAddress": string,
      "businessNameMatched": boolean,
      "addressMatched": boolean,
      "confidence": number,
      "warnings": string[],
      "summary": string
    }
  ]
}

Rules:
- Compare numbers after ignoring spaces, hyphens and punctuation, but never invent characters.
- GSTIN must match exactly after normalisation.
- UDYAM, PAN, FSSAI, Trade Licence and other numbers must match exactly after normalisation when readable.
- Mark readable=false when the number cannot be read.
- Business name and address may be approximate.
- Do not claim database, government portal or official verification.
- Confidence must be from 0 to 100.
`,
      },
    ];

    for (const document of documentsForAi) {
      const input = mediaInput(document.mediaAssets[0]);
      if (input) content.push(input);
    }

    const aiRes = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL || "gpt-4.1-mini",
          input: [{ role: "user", content }],
        }),
      }
    );

    const aiJson = await aiRes.json().catch(() => null);

    if (!aiRes.ok) {
      console.error(
        "REGISTRATION_DOCUMENT_AI_FAILED",
        aiJson
      );

      const results = [
        ...prechecked,
        ...documentsForAi.map((document) =>
          emptyResult(document, {
            confidence:
              document.documentType === "gst" ? 35 : 10,
            summary:
              "The certificate was received, but automated comparison failed. Manual review is required.",
            warnings: [
              "Automated document matching was unavailable.",
            ],
          })
        ),
      ];

      return verifiedResponse({
        status: aggregateStatus(results),
        confidence: results.length
          ? Math.round(
              results.reduce(
                (sum, item) => sum + item.confidence,
                0
              ) / results.length
            )
          : 0,
        documents: results,
        summary:
          "Legal certificates were recorded. Automated comparison was unavailable.",
        warnings: results.flatMap((item) => item.warnings),
      });
    }

    const parsed =
      parseJsonLoose(extractOutputText(aiJson)) || {};
    const aiDocuments = Array.isArray(parsed?.documents)
      ? parsed.documents
      : [];

    const aiResults = documentsForAi.map(
      (document, index) => {
        const parsedDocument =
          aiDocuments.find(
            (item: any) => Number(item?.index) === index
          ) ||
          aiDocuments[index] ||
          {};

        const extractedNumber = safeString(
          parsedDocument?.extractedNumber
        );
        const entered = normalizeRegistrationNumber(
          document.enteredNumber
        );
        const extracted =
          normalizeRegistrationNumber(extractedNumber);

        const deterministicMatch =
          Boolean(entered && extracted) &&
          entered === extracted;

        const matched =
          Boolean(parsedDocument?.numberMatched) &&
          deterministicMatch;

        const readable =
          Boolean(parsedDocument?.readable) &&
          Boolean(extracted);

        const confidence = Math.max(
          0,
          Math.min(
            100,
            Number(parsedDocument?.confidence || 0)
          )
        );

        let status: DocumentVerificationResult["status"];

        if (!readable) {
          status = "needs_manual_review";
        } else if (!matched) {
          status = "document_mismatch";
        } else {
          status =
            confidence >= 70
              ? "verified_by_ai"
              : "needs_manual_review";
        }

        return emptyResult(document, {
          extractedNumber,
          matched,
          readable,
          confidence,
          status,
          extractedBusinessName: safeString(
            parsedDocument?.extractedBusinessName
          ),
          extractedAddress: safeString(
            parsedDocument?.extractedAddress
          ),
          businessNameMatched: Boolean(
            parsedDocument?.businessNameMatched
          ),
          addressMatched: Boolean(
            parsedDocument?.addressMatched
          ),
          summary:
            safeString(parsedDocument?.summary) ||
            "Certificate comparison completed.",
          warnings: Array.isArray(
            parsedDocument?.warnings
          )
            ? parsedDocument.warnings
                .map((item: unknown) => safeString(item))
                .filter(Boolean)
            : [],
        });
      }
    );

    const results = [...prechecked, ...aiResults];
    const confidence = results.length
      ? Math.round(
          results.reduce(
            (sum, item) => sum + item.confidence,
            0
          ) / results.length
        )
      : 0;

    const gstDocument = documents.find(
      (item) => item.documentType === "gst"
    );

    return verifiedResponse({
      status: aggregateStatus(results),
      confidence,
      documents: results,
      summary: results.every(
        (item) => item.status === "verified_by_ai"
      )
        ? "All submitted legal registration numbers matched their uploaded certificates."
        : "Legal-document checks completed. Review every document status before final submission.",
      warnings: results.flatMap((item) => item.warnings),
      compatibility: {
        gstinValidation: gstDocument
          ? validateGstin(gstDocument.enteredNumber)
          : undefined,
        gstinMatchedInDocument: results.some(
          (item) =>
            item.documentType === "gst" && item.matched
        ),
        tradeLicenseMatchedInDocument: results.some(
          (item) =>
            item.documentType === "trade_license" &&
            item.matched
        ),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Vendor document verification failed.",
      },
      { status: 500 }
    );
  }
}

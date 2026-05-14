import { NextResponse } from "next/server";
import { validateGstin, documentTextContainsNeedle } from "@/lib/vendor-verification/gstin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || "";
}

function safeString(value: unknown) {
  return String(value || "").trim();
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;

  const chunks: string[] = [];
  const output = Array.isArray(data?.output) ? data.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") chunks.push(c.text);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const gstin = safeString(body?.gstin);
    const tradeLicenseNo = safeString(body?.tradeLicenseNo);
    const businessName = safeString(body?.businessName);
    const businessAddress = safeString(body?.businessAddress);
    const mediaAssets = Array.isArray(body?.mediaAssets) ? body.mediaAssets : [];

    const gstinValidation = gstin
      ? validateGstin(gstin)
      : {
          input: "",
          normalized: "",
          valid: false,
          errors: ["GSTIN not provided."],
          parts: null,
        };

    const uploadedUrls = mediaAssets
      .map((asset: any) => safeString(asset?.url))
      .filter(Boolean);

    if (!uploadedUrls.length) {
      return NextResponse.json({
        ok: true,
        verification: {
          status: "needs_document",
          confidence: 0,
          gstinValidation,
          gstinMatchedInDocument: false,
          tradeLicenseMatchedInDocument: false,
          businessNameMatched: false,
          addressMatched: false,
          summary: "Please upload GST certificate or trade license document for AI tally.",
          warnings: ["No uploaded document/image was provided for document matching."],
        },
      });
    }

    const apiKey = getOpenAIKey();

    if (!apiKey) {
      return NextResponse.json({
        ok: true,
        verification: {
          status: gstinValidation.valid ? "format_valid_needs_manual_review" : "format_invalid",
          confidence: gstinValidation.valid ? 35 : 5,
          gstinValidation,
          gstinMatchedInDocument: false,
          tradeLicenseMatchedInDocument: false,
          businessNameMatched: false,
          addressMatched: false,
          summary: "GSTIN format was checked locally, but AI document matching is disabled because OPENAI_API_KEY is missing.",
          warnings: gstinValidation.errors,
        },
      });
    }

    const imageInputs = uploadedUrls.slice(0, 4).map((url: string) => ({
      type: "input_image",
      image_url: url,
      detail: "high",
    }));

    const prompt = `
You are verifying vendor onboarding documents for 3bigha.com.

Compare the typed business details with the uploaded GST certificate / trade license / business proof image or PDF preview.

Typed data:
GSTIN: ${gstin || "not provided"}
Trade License No: ${tradeLicenseNo || "not provided"}
Business Name: ${businessName || "not provided"}
Business Address: ${businessAddress || "not provided"}

Return JSON only with:
{
  "documentType": "gst_certificate" | "trade_license" | "business_proof" | "unknown",
  "extractedGstin": string,
  "extractedTradeLicenseNo": string,
  "extractedBusinessName": string,
  "extractedAddress": string,
  "gstinMatchedInDocument": boolean,
  "tradeLicenseMatchedInDocument": boolean,
  "businessNameMatched": boolean,
  "addressMatched": boolean,
  "confidence": number,
  "warnings": string[],
  "summary": string
}

Rules:
- Match GSTIN exactly if visible.
- Match trade license number exactly or near-exactly if visible.
- Business name/address may be approximate.
- Do not claim official government verification.
- If the document is unclear, say needs manual review.
`;

    const aiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              ...imageInputs,
            ],
          },
        ],
      }),
    });

    const aiJson = await aiRes.json().catch(() => null);

    if (!aiRes.ok) {
      return NextResponse.json({
        ok: true,
        verification: {
          status: gstinValidation.valid ? "format_valid_needs_manual_review" : "format_invalid",
          confidence: gstinValidation.valid ? 35 : 5,
          gstinValidation,
          gstinMatchedInDocument: false,
          tradeLicenseMatchedInDocument: false,
          businessNameMatched: false,
          addressMatched: false,
          summary: "GSTIN format checked locally, but AI document reading failed. Please review manually.",
          warnings: [aiJson?.error?.message || "AI document verification failed."],
        },
      });
    }

    const outputText = extractOutputText(aiJson);
    const parsed = parseJsonLoose(outputText) || {};

    const extractedGstin = safeString(parsed?.extractedGstin);
    const extractedTradeLicenseNo = safeString(parsed?.extractedTradeLicenseNo);

    const fallbackGstinMatch =
      extractedGstin && gstin
        ? documentTextContainsNeedle(extractedGstin, gstin) ||
          documentTextContainsNeedle(gstin, extractedGstin)
        : false;

    const fallbackTradeMatch =
      extractedTradeLicenseNo && tradeLicenseNo
        ? documentTextContainsNeedle(extractedTradeLicenseNo, tradeLicenseNo) ||
          documentTextContainsNeedle(tradeLicenseNo, extractedTradeLicenseNo)
        : false;

    const gstinMatchedInDocument = Boolean(parsed?.gstinMatchedInDocument) || fallbackGstinMatch;
    const tradeLicenseMatchedInDocument =
      Boolean(parsed?.tradeLicenseMatchedInDocument) || fallbackTradeMatch;

    const confidence = Math.max(
      0,
      Math.min(100, Number(parsed?.confidence || 0))
    );

    const warnings = Array.isArray(parsed?.warnings)
      ? parsed.warnings.map((x: any) => String(x)).filter(Boolean)
      : [];

    if (!gstinValidation.valid && gstin) {
      warnings.unshift(...gstinValidation.errors);
    }

    let status:
      | "verified_by_ai"
      | "format_valid_document_mismatch"
      | "format_invalid"
      | "needs_manual_review";

    if (gstin && !gstinValidation.valid) {
      status = "format_invalid";
    } else if ((gstin && gstinMatchedInDocument) || (tradeLicenseNo && tradeLicenseMatchedInDocument)) {
      status = confidence >= 70 ? "verified_by_ai" : "needs_manual_review";
    } else if (gstinValidation.valid) {
      status = "format_valid_document_mismatch";
    } else {
      status = "needs_manual_review";
    }

    return NextResponse.json({
      ok: true,
      verification: {
        status,
        confidence,
        gstinValidation,
        documentType: safeString(parsed?.documentType) || "unknown",
        extractedGstin,
        extractedTradeLicenseNo,
        extractedBusinessName: safeString(parsed?.extractedBusinessName),
        extractedAddress: safeString(parsed?.extractedAddress),
        gstinMatchedInDocument,
        tradeLicenseMatchedInDocument,
        businessNameMatched: Boolean(parsed?.businessNameMatched),
        addressMatched: Boolean(parsed?.addressMatched),
        summary:
          safeString(parsed?.summary) ||
          "AI-assisted document tally completed. Please manually review before final approval.",
        warnings,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Vendor document verification failed.",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { generateRegistrationDocumentIntelligence } from "@/lib/admin/registration-document-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    { ok: false, error: message, code },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return errorResponse(
      String(
        access.error ||
          "Master administrator access is required."
      ),
      Number(access.status || 403),
      "ADMIN_ACCESS_REQUIRED"
    );
  }

  let body: Record<string, unknown>;

  try {
    const parsed = await request.json();
    body =
      parsed && typeof parsed === "object"
        ? parsed as Record<string, unknown>
        : {};
  } catch {
    return errorResponse(
      "A valid JSON request is required.",
      400,
      "INVALID_JSON"
    );
  }

  const userId = String(
    body.userId || body.user_id || ""
  ).trim();
  const caseId = String(
    body.caseId || body.case_id || ""
  ).trim();
  const evidencePath = String(
    body.evidencePath ||
      body.evidence_path ||
      ""
  ).trim();

  if (!userId || !evidencePath) {
    return errorResponse(
      "A member and private document path are required.",
      400,
      "DOCUMENT_REQUEST_INCOMPLETE"
    );
  }

  if (
    !evidencePath.startsWith(
      `${userId}/registration/`
    ) ||
    evidencePath.includes("..") ||
    evidencePath.startsWith("/") ||
    evidencePath.includes("\\")
  ) {
    return errorResponse(
      "The private document path is invalid.",
      400,
      "INVALID_DOCUMENT_PATH"
    );
  }

  try {
    const intelligence =
      await generateRegistrationDocumentIntelligence(
        access.admin,
        {
          reviewerId: access.user.id,
          userId,
          caseId: caseId || null,
          evidencePath,
        }
      );

    return NextResponse.json(
      {
        ok: true,
        code:
          "REGISTRATION_DOCUMENT_INTELLIGENCE_READY",
        intelligence,
        safeguards: {
          originalEvidenceModified: false,
          registrationStatusChanged: false,
          approvalStatusChanged: false,
          dashboardStatusChanged: false,
          subscriptionChanged: false,
          humanReviewRequired:
            intelligence.status !==
            "completed",
        },
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "REGISTRATION_DOCUMENT_INTELLIGENCE_FAILED",
      {
        reviewerId: access.user.id,
        userId,
        caseId: caseId || null,
        evidencePath,
        message:
          error instanceof Error
            ? error.message
            : "Unknown extraction error",
      }
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Document intelligence could not be generated.",
      500,
      "REGISTRATION_DOCUMENT_INTELLIGENCE_FAILED"
    );
  }
}

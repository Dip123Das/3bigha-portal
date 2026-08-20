import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { generateRegistrationCrossVerification } from "@/lib/admin/registration-cross-verification";

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
  const documentIntelligenceId = String(
    body.documentIntelligenceId ||
      body.document_intelligence_id ||
      ""
  ).trim();

  if (!userId || !documentIntelligenceId) {
    return errorResponse(
      "A member and document-intelligence record are required.",
      400,
      "CROSS_VERIFICATION_REQUEST_INCOMPLETE"
    );
  }

  try {
    const verification =
      await generateRegistrationCrossVerification(
        access.admin,
        {
          reviewerId: access.user.id,
          userId,
          caseId: caseId || null,
          documentIntelligenceId,
        }
      );

    return NextResponse.json(
      {
        ok: true,
        code:
          "REGISTRATION_CROSS_VERIFICATION_READY",
        verification,
        safeguards: {
          advisoryOnly: true,
          registrationStatusChanged: false,
          approvalStatusChanged: false,
          dashboardStatusChanged: false,
          subscriptionChanged: false,
          humanDecisionRequired:
            verification.recommendedAction !==
            "consistent",
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
      "REGISTRATION_CROSS_VERIFICATION_FAILED",
      {
        reviewerId: access.user.id,
        userId,
        caseId: caseId || null,
        documentIntelligenceId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown cross-verification error",
      }
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Cross-verification could not be generated.",
      500,
      "REGISTRATION_CROSS_VERIFICATION_FAILED"
    );
  }
}

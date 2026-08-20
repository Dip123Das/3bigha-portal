import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { generateRegistrationAiReviewBrief } from "@/lib/admin/registration-ai-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseHeaders() {
  return {
    "Cache-Control":
      "private, no-store, max-age=0",
    "Referrer-Policy": "no-referrer",
  };
}

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    { ok: false, error: message, code },
    {
      status,
      headers: responseHeaders(),
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

  if (!userId) {
    return errorResponse(
      "A registration member is required.",
      400,
      "USER_ID_REQUIRED"
    );
  }

  try {
    const brief =
      await generateRegistrationAiReviewBrief(
        access.admin,
        userId,
        caseId || null
      );

    return NextResponse.json(
      {
        ok: true,
        code:
          "REGISTRATION_AI_REVIEW_BRIEF_GENERATED",
        brief,
        safeguards: {
          advisoryOnly: true,
          databaseWritePerformed: false,
          registrationStatusChanged: false,
          approvalStatusChanged: false,
          dashboardStatusChanged: false,
          subscriptionChanged: false,
        },
      },
      {
        headers: responseHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "REGISTRATION_AI_REVIEW_BRIEF_FAILED",
      {
        adminId: access.user.id,
        userId,
        caseId: caseId || null,
        message:
          error instanceof Error
            ? error.message
            : "Unknown review brief error",
      }
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "The AI review brief could not be generated.",
      500,
      "REGISTRATION_AI_REVIEW_BRIEF_FAILED"
    );
  }
}

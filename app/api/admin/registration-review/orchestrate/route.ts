import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { orchestrateRegistrationReview } from "@/lib/admin/registration-orchestration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function responseHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
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
    { status, headers: responseHeaders() }
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
    const orchestration =
      await orchestrateRegistrationReview(
        access.admin,
        {
          reviewerId: access.user.id,
          userId,
          caseId: caseId || null,
        }
      );

    return NextResponse.json(
      {
        ok: true,
        code: "REGISTRATION_ORCHESTRATION_COMPLETED",
        orchestration,
      },
      { headers: responseHeaders() }
    );
  } catch (error) {
    console.error(
      "REGISTRATION_ORCHESTRATION_FAILED",
      {
        reviewerId: access.user.id,
        userId,
        caseId: caseId || null,
        message:
          error instanceof Error
            ? error.message
            : "Unknown orchestration error",
      }
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Registration orchestration could not be completed.",
      500,
      "REGISTRATION_ORCHESTRATION_FAILED"
    );
  }
}

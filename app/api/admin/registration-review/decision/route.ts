import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set([
  "approve",
  "request_correction",
  "manual_review",
  "reject",
]);

function redirectBack(
  request: Request,
  caseId: string,
  state: "success" | "error",
  message: string
) {
  const url = new URL(
    "/admin/verification-reviews",
    request.url
  );

  if (caseId) {
    url.searchParams.set("case", caseId);
  }

  url.searchParams.set("decision", state);
  url.searchParams.set("message", message);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return NextResponse.json(
      {
        ok: false,
        error:
          access.error ||
          "Master administrator access is required.",
      },
      {
        status: Number(access.status || 403),
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  }

  const form = await request.formData();
  const userId = String(
    form.get("user_id") || ""
  ).trim();
  const caseId = String(
    form.get("case_id") || ""
  ).trim();
  const action = String(
    form.get("action") || ""
  )
    .trim()
    .toLowerCase();
  const reason = String(
    form.get("reason") || ""
  ).trim();

  if (
    !userId ||
    !caseId ||
    !ACTIONS.has(action)
  ) {
    return redirectBack(
      request,
      caseId,
      "error",
      "The review request is incomplete."
    );
  }

  if (reason.length < 10) {
    return redirectBack(
      request,
      caseId,
      "error",
      "Enter a clear review reason of at least 10 characters."
    );
  }

  const { data, error } =
    await access.admin.rpc(
      "admin_decide_registration_verification",
      {
        p_user_id: userId,
        p_action: action,
        p_reason: reason,
        p_case_id: caseId,
      }
    );

  if (error) {
    console.error(
      "ADMIN_REGISTRATION_DECISION_FAILED",
      {
        adminId: access.user.id,
        userId,
        caseId,
        action,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }
    );

    return redirectBack(
      request,
      caseId,
      "error",
      error.message ||
        "The registration decision could not be saved."
    );
  }

  const nextStatus =
    data &&
    typeof data === "object" &&
    "nextStatus" in data
      ? String(data.nextStatus || "")
      : "";

  return redirectBack(
    request,
    caseId,
    "success",
    nextStatus
      ? `Decision saved: ${nextStatus}.`
      : "The registration decision was saved."
  );
}

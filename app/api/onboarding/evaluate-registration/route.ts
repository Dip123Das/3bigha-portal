import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerificationRpcResult = {
  ok?: boolean;
  status?: string;
  score?: number;
  reasons?: unknown[];
  dashboard_status?: string;
  can_activate_dashboard?: boolean;
  dashboard_activated?: boolean;
  approval_status_changed?: boolean;
  subscription_changed?: boolean;
  decision_source?: string;
};

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
    },
    { status }
  );
}

function normalizeResult(
  value: unknown
): VerificationRpcResult {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as VerificationRpcResult;
}

function responseStatusForDecision(
  decision: string
): number {
  switch (decision) {
    case "auto_verified":
      return 200;

    case "evidence_incomplete":
    case "correction_required":
    case "admin_review_required":
      return 409;

    case "restricted":
      return 403;

    default:
      return 500;
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Login required.",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    /*
     * This RPC accepts no parameters.
     *
     * The authenticated PostgreSQL session resolves auth.uid()
     * and loads all role, profile and evidence facts directly
     * from the database.
     *
     * The browser cannot supply:
     * - verification status
     * - score
     * - reasons
     * - role
     * - approval decision
     * - dashboard activation decision
     */
    const { data, error } = await supabase.rpc(
      "evaluate_automated_registration_verification"
    );

    if (error) {
      console.error(
        "AUTOMATED_REGISTRATION_VERIFICATION_RPC_FAILED",
        {
          userId: user.id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        }
      );

      const message =
        String(error.message || "").trim();

      if (
        message.includes(
          "existing permitted member role"
        )
      ) {
        return errorResponse(
          "Please complete your identity declaration before verification.",
          409,
          "PERMITTED_ROLE_REQUIRED"
        );
      }

      if (
        message.includes("Member profile not found")
      ) {
        return errorResponse(
          "Member profile not found.",
          404,
          "PROFILE_NOT_FOUND"
        );
      }

      if (
        error.code === "42501" ||
        message.includes(
          "Authentication required"
        )
      ) {
        return errorResponse(
          "Login required.",
          401,
          "AUTHENTICATION_REQUIRED"
        );
      }

      return errorResponse(
        "Registration verification could not be completed safely.",
        500,
        "AUTOMATED_VERIFICATION_FAILED"
      );
    }

    const result = normalizeResult(data);
    const decision = String(
      result.status || ""
    )
      .trim()
      .toLowerCase();

    if (result.ok !== true || !decision) {
      console.error(
        "AUTOMATED_REGISTRATION_VERIFICATION_INVALID_RESULT",
        {
          userId: user.id,
          result,
        }
      );

      return errorResponse(
        "The verification service returned an invalid decision.",
        500,
        "INVALID_VERIFICATION_RESULT"
      );
    }

    const status =
      responseStatusForDecision(decision);

    const payload = {
      ok: decision === "auto_verified",
      evaluated: true,
      code:
        decision === "auto_verified"
          ? "REGISTRATION_AUTO_VERIFIED"
          : decision === "evidence_incomplete"
          ? "REGISTRATION_EVIDENCE_INCOMPLETE"
          : decision === "correction_required"
          ? "REGISTRATION_CORRECTION_REQUIRED"
          : decision === "admin_review_required"
          ? "REGISTRATION_ADMIN_REVIEW_REQUIRED"
          : decision === "restricted"
          ? "REGISTRATION_RESTRICTED"
          : "UNKNOWN_VERIFICATION_DECISION",

      verificationStatus: decision,
      verificationScore:
        Number.isFinite(Number(result.score))
          ? Number(result.score)
          : 0,
      verificationReasons:
        Array.isArray(result.reasons)
          ? result.reasons
          : [],

      dashboardStatus:
        String(
          result.dashboard_status ||
            "not_ready"
        ),
      canActivateDashboard:
        result.can_activate_dashboard === true,
      dashboardActivated:
        result.dashboard_activated === true,

      approvalStatusChanged:
        result.approval_status_changed === true,
      subscriptionChanged:
        result.subscription_changed === true,

      decisionSource:
        String(
          result.decision_source ||
            "automated_registration_verification_v1"
        ),
    };

    return NextResponse.json(
      payload,
      { status }
    );
  } catch (error) {
    console.error(
      "AUTOMATED_REGISTRATION_VERIFICATION_UNEXPECTED_ERROR",
      error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unexpected registration verification error.",
      500,
      "UNEXPECTED_ERROR"
    );
  }
}

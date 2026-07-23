import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  resolveRegistrationCompatibilityProjection,
} from "@/lib/registration/resolveRegistrationCompatibilityProjection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CompletionProfileRow = {
  id: string;
  role: string | null;
  account_status: string | null;
  portal_use_reason: string | null;
  role_display_label: string | null;
};

type CompletionBusinessRow = {
  user_id: string;
  nature_of_business: string[] | null;
  contact_person: string | null;
  phone_primary: string | null;
  city: string | null;
  state: string | null;
  is_complete: boolean | null;
  registration_complete: boolean | null;
  location_verification_status: string | null;
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

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

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

    const [profileResult, businessResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          [
            "id",
            "role",
            "account_status",
            "portal_use_reason",
            "role_display_label",
          ].join(",")
        )
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("business_profiles")
        .select(
          [
            "user_id",
            "nature_of_business",
            "contact_person",
            "phone_primary",
            "city",
            "state",
            "is_complete",
            "registration_complete",
            "location_verification_status",
          ].join(",")
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error(
        "REGISTRATION_COMPLETION_PROFILE_LOOKUP_FAILED",
        profileResult.error
      );

      return errorResponse(
        "Your member profile could not be loaded.",
        500,
        "PROFILE_LOOKUP_FAILED"
      );
    }

    if (businessResult.error) {
      console.error(
        "REGISTRATION_COMPLETION_BUSINESS_LOOKUP_FAILED",
        businessResult.error
      );

      return errorResponse(
        "Your business profile could not be loaded.",
        500,
        "BUSINESS_PROFILE_LOOKUP_FAILED"
      );
    }

    const profile =
      profileResult.data as unknown as CompletionProfileRow | null;

    const business =
      businessResult.data as unknown as CompletionBusinessRow | null;

    if (!profile) {
      return errorResponse(
        "Member profile not found.",
        404,
        "PROFILE_NOT_FOUND"
      );
    }

    if (!business) {
      return errorResponse(
        "Business profile not found.",
        409,
        "BUSINESS_PROFILE_REQUIRED"
      );
    }

    const accountStatus = String(
      profile.account_status || "active"
    )
      .trim()
      .toLowerCase();

    if (
      [
        "deactivated",
        "re_registration_required",
        "permanently_blocked",
      ].includes(accountStatus)
    ) {
      return errorResponse(
        "This account cannot complete registration in its current state.",
        403,
        "ACCOUNT_RESTRICTED"
      );
    }

    if (business.is_complete !== true) {
      return errorResponse(
        "Please complete the required business information first.",
        409,
        "BUSINESS_PROFILE_INCOMPLETE"
      );
    }

    const locationVerified =
      String(
        business.location_verification_status || ""
      )
        .trim()
        .toLowerCase() === "verified";

    if (!locationVerified) {
      return errorResponse(
        "Please verify your live business location first.",
        409,
        "LOCATION_VERIFICATION_REQUIRED"
      );
    }

    let projection;

    try {
      projection =
        resolveRegistrationCompatibilityProjection({
          role: profile.role,
          portalUseReason: profile.portal_use_reason,
          roleDisplayLabel: profile.role_display_label,
          natureOfBusiness: Array.isArray(
            business.nature_of_business
          )
            ? business.nature_of_business
            : [],
          contactPerson: business.contact_person,
          phonePrimary: business.phone_primary,
          city: business.city,
          state: business.state,
        });
    } catch (error) {
      return errorResponse(
        error instanceof Error
          ? error.message
          : "A permitted member role is required.",
        409,
        "PERMITTED_ROLE_REQUIRED"
      );
    }

    /*
     * This RPC executes through the authenticated session client.
     * Therefore auth.uid() remains the current member.
     *
     * No service-role client is used for registration authority.
     */
    const { data, error } = await supabase.rpc(
      "complete_self_registration_compatibility",
      {
        p_portal_use_reason:
          projection.portalUseReason,
        p_role_display_label:
          projection.roleDisplayLabel,
        p_full_name:
          projection.profilePatch.full_name,
        p_phone:
          projection.profilePatch.phone,
        p_city:
          projection.profilePatch.city,
        p_state:
          projection.profilePatch.state,
        p_module_grants:
          projection.moduleGrants,
      }
    );

    if (error) {
      console.error(
        "REGISTRATION_COMPLETION_RPC_FAILED",
        error
      );

      return errorResponse(
        error.message ||
          "Registration could not be completed safely.",
        500,
        "REGISTRATION_COMPLETION_FAILED"
      );
    }

    const result =
      data && typeof data === "object"
        ? data as Record<string, unknown>
        : {};

    if (result.ok !== true) {
      return NextResponse.json(
        {
          ok: false,
          code:
            String(result.reason || "") ||
            "REGISTRATION_NOT_COMPLETED",
          result,
        },
        { status: 409 }
      );
    }

    /*
     * P04-E4D
     *
     * Compatibility completion has succeeded.
     * Automated verification is now evaluated from the
     * canonical evidence stored in the database.
     *
     * This RPC accepts no client decision parameters.
     */
    const {
      data: verificationData,
      error: verificationError,
    } = await supabase.rpc(
      "evaluate_automated_registration_verification"
    );

    if (verificationError) {
      console.error(
        "AUTOMATED_REGISTRATION_VERIFICATION_FAILED",
        {
          userId: user.id,
          code: verificationError.code,
          message: verificationError.message,
          details: verificationError.details,
          hint: verificationError.hint,
        }
      );

      return errorResponse(
        "Registration was completed, but automated verification could not be evaluated safely.",
        500,
        "AUTOMATED_VERIFICATION_FAILED"
      );
    }

    const verificationResult =
      verificationData &&
      typeof verificationData === "object"
        ? verificationData as Record<string, unknown>
        : {};

    const verificationStatus = String(
      verificationResult.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      verificationResult.ok !== true ||
      !verificationStatus
    ) {
      console.error(
        "AUTOMATED_REGISTRATION_VERIFICATION_INVALID_RESULT",
        {
          userId: user.id,
          verificationResult,
        }
      );

      return errorResponse(
        "Registration was completed, but the verification service returned an invalid decision.",
        500,
        "INVALID_VERIFICATION_RESULT"
      );
    }

    return NextResponse.json({
      ok: true,
      code:
        "REGISTRATION_COMPLETION_AND_VERIFICATION_EVALUATED",

      completion: {
        completed: true,
        registrationComplete: true,
        onboardingCompleted: true,
        role: projection.role,
        moduleGrants: projection.moduleGrants,
      },

      verification: {
        status: verificationStatus,
        score:
          typeof verificationResult.score === "number"
            ? verificationResult.score
            : Number(verificationResult.score || 0),
        reasons: Array.isArray(
          verificationResult.reasons
        )
          ? verificationResult.reasons
          : [],
        dashboardStatus: String(
          verificationResult.dashboard_status ||
            "not_ready"
        ),
        canActivateDashboard:
          verificationResult.can_activate_dashboard ===
          true,
        dashboardActivated:
          verificationResult.dashboard_activated === true,
        decisionSource: String(
          verificationResult.decision_source ||
            "automated_registration_verification_v1"
        ),
      },

      /*
       * Compatibility completion and automated
       * verification do not activate the dashboard.
       */
      dashboardActivation: "not_changed",
    });
  } catch (error) {
    console.error(
      "REGISTRATION_COMPLETION_UNEXPECTED_ERROR",
      error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unexpected registration completion error.",
      500,
      "UNEXPECTED_ERROR"
    );
  }
}

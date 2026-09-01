import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  resolveRegistrationCompatibilityProjection,
} from "@/lib/registration/resolveRegistrationCompatibilityProjection";
import {
  loadIdentityProjectionSet,
} from "@/lib/identity/loadIdentityProjections";
import type { UploadedMediaAsset } from "@/lib/media/media-config";
import type { BtceCapabilityClaim } from "@/lib/btce/shared/btce-types";
import {
  persistRegistrationIntelligenceSnapshot,
  resolveRegistrationIntelligence,
} from "@/lib/registration/intelligence";
import type {
  RegistrationIntelligencePersistenceClient,
} from "@/lib/registration/intelligence";

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
  business_type: string | null;
  nature_of_business: string[] | null;
  business_identities: string[] | null;
  individual_identities: string[] | null;
  contact_person: string | null;
  phone_primary: string | null;
  city: string | null;
  state: string | null;
  is_complete: boolean | null;
  registration_complete: boolean | null;
  location_verification_status: string | null;
  business_media_json: unknown;
  vendor_document_verification_json: unknown;
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

function normalizeMediaAssets(
  value: unknown
): UploadedMediaAsset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;

    const id = String(record.id || "").trim();
    const url = String(record.url || "").trim();
    const bucket = String(record.bucket || "").trim();
    const mediaPath = String(record.path || "").trim();
    const name = String(record.name || "").trim();
    const mimeType = String(record.mimeType || "").trim();
    const kind = String(record.kind || "").trim();
    const size = Number(record.size || 0);

    if (
      !id ||
      !url ||
      !bucket ||
      !mediaPath ||
      !name ||
      !mimeType ||
      !["image", "video", "document"].includes(kind) ||
      !Number.isFinite(size) ||
      size < 0
    ) {
      return [];
    }

    return [{
      id,
      url,
      bucket,
      path: mediaPath,
      name,
      size,
      mimeType,
      kind: kind as UploadedMediaAsset["kind"],
    }];
  });
}

function normalizeDocumentVerification(
  value: unknown
): {
  documents?: Array<Record<string, unknown>> | null;
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    documents: Array.isArray(record.documents)
      ? record.documents.filter(
          (document): document is Record<string, unknown> =>
            Boolean(document) &&
            typeof document === "object" &&
            !Array.isArray(document)
        )
      : null,
  };
}

function buildCapabilityClaims(
  natureOfBusiness: string[] | null
): BtceCapabilityClaim[] {
  const declaredAt = new Date().toISOString();

  return [
    ...new Set(
      (Array.isArray(natureOfBusiness)
        ? natureOfBusiness
        : []
      )
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    ),
  ].map((label) => ({
    code:
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") ||
      "declared_business_capability",
    label,
    description:
      "Capability declared by the member during business registration.",
    declaredAt,
    tags: ["registration_declaration"],
  }));
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
            "business_type",
            "nature_of_business",
            "business_identities",
            "individual_identities",
            "contact_person",
            "phone_primary",
            "city",
            "state",
            "is_complete",
            "registration_complete",
            "location_verification_status",
            "business_media_json",
            "vendor_document_verification_json",
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

    const constitutionKey = String(
      business.business_type || ""
    ).trim();

    const selectedBusinessIdentityKeys = Array.from(
      new Set(
        (Array.isArray(business.business_identities)
          ? business.business_identities
          : []
        )
          .map((key) => String(key || "").trim())
          .filter(Boolean)
      )
    );

    if (!constitutionKey) {
      return errorResponse(
        "Please select your Legal Constitution.",
        409,
        "CONSTITUTION_REQUIRED"
      );
    }

    if (!selectedBusinessIdentityKeys.length) {
      return errorResponse(
        "Please select at least one Business Identity.",
        409,
        "BUSINESS_IDENTITY_REQUIRED"
      );
    }

    const [
      constitutionResult,
      identityResult,
      mappingResult,
    ] = await Promise.all([
      supabase
        .from("registration_legal_constitutions")
        .select("key")
        .eq("key", constitutionKey)
        .eq("is_active", true)
        .maybeSingle(),

      supabase
        .from("identity_master")
        .select("identity_key,registration_scopes")
        .in("identity_key", selectedBusinessIdentityKeys)
        .eq("is_active", true),

      supabase
        .from("registration_identity_sector_map")
        .select("identity_key,sector_key,nature_modules")
        .in("identity_key", selectedBusinessIdentityKeys)
        .eq("is_active", true),
    ]);

    const masterError =
      constitutionResult.error ||
      identityResult.error ||
      mappingResult.error;

    if (masterError) {
      console.error(
        "REGISTRATION_MASTER_VALIDATION_FAILED",
        masterError
      );

      return errorResponse(
        "Registration master data could not be validated. Please try again.",
        500,
        "REGISTRATION_MASTER_VALIDATION_FAILED"
      );
    }

    if (!constitutionResult.data) {
      return errorResponse(
        "Select an active Legal Constitution from Business Registration.",
        409,
        "INVALID_CONSTITUTION"
      );
    }

    const validBusinessIdentityKeys = new Set(
      (identityResult.data || [])
        .filter((row: any) =>
          Array.isArray(row.registration_scopes) &&
          row.registration_scopes.includes("business_identity")
        )
        .map((row: any) => row.identity_key)
    );

    const hasInvalidIdentity =
      selectedBusinessIdentityKeys.some(
        (key) => !validBusinessIdentityKeys.has(key)
      );

    if (hasInvalidIdentity) {
      return errorResponse(
        "One or more selected Business Identities are inactive or invalid. Review Business Identity.",
        409,
        "INVALID_BUSINESS_IDENTITY"
      );
    }

    const activeMappings = mappingResult.data || [];
    const mappedIdentityKeys = new Set(
      activeMappings.map((row: any) => row.identity_key)
    );

    const hasUnmappedIdentity =
      selectedBusinessIdentityKeys.some(
        (key) => !mappedIdentityKeys.has(key)
      );

    if (hasUnmappedIdentity) {
      return errorResponse(
        "Every Business Identity must have an active Business Sector mapping.",
        409,
        "BUSINESS_SECTOR_MAPPING_REQUIRED"
      );
    }

    const mappedNature = Array.from(
      new Set(
        activeMappings.flatMap((row: any) =>
          Array.isArray(row.nature_modules)
            ? row.nature_modules
            : []
        )
      )
    );

    const selectedNature = Array.isArray(
      business.nature_of_business
    )
      ? business.nature_of_business
      : [];

    if (
      !mappedNature.length ||
      mappedNature.some(
        (module) => !selectedNature.includes(module)
      )
    ) {
      return errorResponse(
        "Nature of Business must be derived from the selected Business Identities and Sector mappings. Review Business Identity.",
        409,
        "NATURE_MAPPING_REQUIRED"
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
      const selectedIdentityKeys = Array.from(
        new Set([
          ...(Array.isArray(business.business_identities)
            ? business.business_identities
            : []),
          ...(Array.isArray(business.individual_identities)
            ? business.individual_identities
            : []),
        ])
      );

      const identityProjection =
        await loadIdentityProjectionSet(
          supabase,
          selectedIdentityKeys
        );

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
          projectedModules:
            identityProjection.compatibilityModules,
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
     * R3.1 — Atomic self-registration activation
     *
     * Compatibility projection has saved the member's declared
     * identity and module grants. The authoritative database
     * function now performs the complete activation transaction:
     *
     * - locks the member and business profile,
     * - evaluates canonical registration evidence,
     * - completes registration,
     * - activates dashboard access,
     * - records the immutable activation event.
     *
     * It accepts no verification, approval or activation decision
     * from the browser.
     */
    const {
      data: activationData,
      error: activationError,
    } = await supabase.rpc(
      "activate_self_registered_dashboard"
    );

    if (activationError) {
      console.error(
        "ATOMIC_DASHBOARD_ACTIVATION_FAILED",
        {
          userId: user.id,
          code: activationError.code,
          message: activationError.message,
          details: activationError.details,
          hint: activationError.hint,
        }
      );

      return errorResponse(
        "Your registration was saved, but the dashboard could not be activated safely.",
        500,
        "DASHBOARD_ACTIVATION_FAILED"
      );
    }

    const verificationResult =
      activationData &&
      typeof activationData === "object"
        ? activationData as Record<string, unknown>
        : {};

    const verificationStatus = String(
      verificationResult.status || ""
    )
      .trim()
      .toLowerCase();

    if (!verificationStatus) {
      console.error(
        "ATOMIC_DASHBOARD_ACTIVATION_INVALID_RESULT",
        {
          userId: user.id,
          verificationResult,
        }
      );

      return errorResponse(
        "The dashboard activation service returned an invalid decision.",
        500,
        "INVALID_ACTIVATION_RESULT"
      );
    }

    if (
      verificationResult.ok !== true ||
      verificationResult.activated !== true ||
      verificationResult.dashboard_activated !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          code:
            verificationStatus === "evidence_incomplete"
              ? "EVIDENCE_INCOMPLETE"
              : verificationStatus === "correction_required"
              ? "CORRECTION_REQUIRED"
              : verificationStatus === "admin_review_required"
              ? "VERIFICATION_REVIEW_REQUIRED"
              : verificationStatus === "restricted"
              ? "ACCOUNT_RESTRICTED"
              : "DASHBOARD_NOT_READY",
          error:
            verificationStatus === "evidence_incomplete"
              ? "Complete the remaining business evidence before activating your dashboard."
              : verificationStatus === "correction_required"
              ? "Correct the highlighted business-proof information before activating your dashboard."
              : verificationStatus === "admin_review_required"
              ? "Your evidence requires further verification before dashboard activation."
              : verificationStatus === "restricted"
              ? "This account is currently restricted and cannot activate dashboard access."
              : "Your registration is saved, but the dashboard is not ready for activation.",
          verification: verificationResult,
        },
        { status: 409 }
      );
    }

    /*
     * INT-1B2
     *
     * Registration completion and automated verification have
     * succeeded. Resolve explainable registration intelligence
     * from canonical evidence and persist an immutable snapshot.
     *
     * No trust or capability decision is accepted from the client.
     */
    let registrationIntelligence:
      | {
          status: "created";
          snapshotId: string;
          version: string;
          trustScore: number;
          trustConfidence: number;
          confidenceBand: string;
          requiresHumanReview: boolean;
          evidenceCount: number;
          capabilityCount: number;
          createdAt: string;
        }
      | {
          status: "deferred";
          reason: string;
        };

    try {
      const intelligenceSnapshot =
        resolveRegistrationIntelligence({
          businessId: user.id,
          assets: normalizeMediaAssets(
            business.business_media_json
          ),
          documentVerification:
            normalizeDocumentVerification(
              business.vendor_document_verification_json
            ),
          capabilityClaims: buildCapabilityClaims(
            business.nature_of_business
          ),
          generatedAt: new Date().toISOString(),
        });

      const persistedSnapshot =
        await persistRegistrationIntelligenceSnapshot(
          supabase as unknown as
            RegistrationIntelligencePersistenceClient,
          {
            userId: user.id,
            snapshot: intelligenceSnapshot,
            source: "registration_completion",
          }
        );

      registrationIntelligence = {
        status: "created",
        snapshotId: persistedSnapshot.id,
        version: persistedSnapshot.version,
        trustScore: persistedSnapshot.trustScore,
        trustConfidence:
          persistedSnapshot.trustConfidence,
        confidenceBand:
          intelligenceSnapshot.trust.confidenceBand,
        requiresHumanReview:
          persistedSnapshot.requiresHumanReview,
        evidenceCount:
          intelligenceSnapshot.processing
            .registrationEvidenceCount,
        capabilityCount:
          intelligenceSnapshot.trust
            .capabilityClaims.length,
        createdAt: persistedSnapshot.createdAt,
      };
    } catch (intelligenceError) {
      const intelligenceFailureMessage =
        intelligenceError instanceof Error
          ? intelligenceError.message
          : "Registration intelligence could not be recorded.";

      console.error(
        "REGISTRATION_INTELLIGENCE_PERSISTENCE_DEFERRED",
        {
          userId: user.id,
          error: intelligenceFailureMessage,
        }
      );

      /*
       * Dashboard activation has already succeeded through the
       * authoritative database transaction. Registration
       * intelligence is auxiliary and must never reverse or
       * misrepresent that successful activation.
       *
       * A later refresh may safely rebuild this snapshot.
       */
      registrationIntelligence = {
        status: "deferred",
        reason: intelligenceFailureMessage,
      };
    }

    return NextResponse.json({
      ok: true,
      code:
        "REGISTRATION_COMPLETION_AND_DASHBOARD_ACTIVATED",

      completion: {
        completed: true,
        registrationComplete:
          verificationResult.registration_complete === true,
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
            "active"
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

      registrationIntelligence,

      dashboardActivation: {
        activated:
          verificationResult.dashboard_activated === true,
        alreadyActive:
          verificationResult.already_active === true,
        status: String(
          verificationResult.dashboard_status || "active"
        ),
        decisionSource: String(
          verificationResult.decision_source ||
            "atomic_self_registration_activation_v1"
        ),
      },
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

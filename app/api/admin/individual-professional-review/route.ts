import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewDecision =
  | "approved_lifetime_free"
  | "correction_requested"
  | "rejected_misuse"
  | "reclassified_as_business";

type ProfessionalProfile = {
  user_id: string;
  primary_skill_key: string;
  economic_mode: string;
  worker_declaration_accepted: boolean;
  original_name_warning_accepted: boolean;
  contractor_risk_status: string;
  verification_status: string;
  selfie_verification_status: string;
  work_evidence_verification_status: string;
  identity_name_match_status: string;
  ai_verification_status: string;
  ai_confidence: number | null;
  ai_result_json: Record<string, unknown> | null;
  lifetime_free_eligible: boolean;
  lifetime_free_decision_status: string;
  lifetime_free_decision_reason: string | null;
  verified_selfie_json: Record<string, unknown> | null;
  work_photo_one_json: Record<string, unknown> | null;
  work_photo_two_json: Record<string, unknown> | null;
};

const DECISIONS = new Set<ReviewDecision>([
  "approved_lifetime_free",
  "correction_requested",
  "rejected_misuse",
  "reclassified_as_business",
]);

function safeString(value: unknown) {
  return String(value || "").trim();
}

function isDecision(
  value: string
): value is ReviewDecision {
  return DECISIONS.has(value as ReviewDecision);
}

function approvalRequirements(
  profile: ProfessionalProfile
) {
  const failures: string[] = [];

  if (
    profile.economic_mode !==
    "self_working_individual"
  ) {
    failures.push(
      "The applicant is not classified as a self-working individual."
    );
  }

  if (!profile.worker_declaration_accepted) {
    failures.push(
      "The self-working declaration is incomplete."
    );
  }

  if (!profile.original_name_warning_accepted) {
    failures.push(
      "The original-name declaration is incomplete."
    );
  }

  if (
    profile.selfie_verification_status !==
    "verified"
  ) {
    failures.push(
      "The live selfie has not been human-verified."
    );
  }

  if (
    profile.work_evidence_verification_status !==
    "verified"
  ) {
    failures.push(
      "The work evidence has not been human-verified."
    );
  }

  if (
    !["not_detected", "cleared"].includes(
      profile.contractor_risk_status
    )
  ) {
    failures.push(
      "Contractor risk has not been cleared."
    );
  }

  if (
    profile.identity_name_match_status ===
    "mismatch"
  ) {
    failures.push(
      "The identity name mismatch has not been resolved."
    );
  }

  return failures;
}

function buildTransition(
  decision: ReviewDecision,
  profile: ProfessionalProfile,
  reviewerId: string,
  reason: string
) {
  const now = new Date().toISOString();

  if (decision === "approved_lifetime_free") {
    const failures =
      approvalRequirements(profile);

    if (failures.length) {
      return {
        error:
          "Lifetime-free approval requirements are incomplete.",
        failures,
      } as const;
    }

    return {
      update: {
        verification_status: "verified",
        contractor_risk_status:
          profile.contractor_risk_status ===
          "cleared"
            ? "cleared"
            : "not_detected",
        lifetime_free_decision_status:
          "approved",
        lifetime_free_decision_reason:
          reason,
        lifetime_free_eligible: true,
        lifetime_free_approved_at: now,
        lifetime_free_approved_by:
          reviewerId,
        classification_reviewed_at: now,
        classification_reviewed_by:
          reviewerId,
        verified_at: now,
        verified_by: reviewerId,
      },
    } as const;
  }

  if (decision === "correction_requested") {
    return {
      update: {
        verification_status:
          "needs_correction",
        lifetime_free_decision_status:
          "pending_human_review",
        lifetime_free_decision_reason:
          reason,
        lifetime_free_eligible: false,
        lifetime_free_approved_at: null,
        lifetime_free_approved_by: null,
        classification_reviewed_at: now,
        classification_reviewed_by:
          reviewerId,
      },
    } as const;
  }

  if (decision === "rejected_misuse") {
    return {
      update: {
        verification_status: "rejected",
        lifetime_free_decision_status:
          "not_eligible",
        lifetime_free_decision_reason:
          reason,
        lifetime_free_eligible: false,
        lifetime_free_approved_at: null,
        lifetime_free_approved_by: null,
        classification_reviewed_at: now,
        classification_reviewed_by:
          reviewerId,
        reclassification_reason: reason,
      },
    } as const;
  }

  return {
    update: {
      verification_status:
        "reclassified_as_business",
      economic_mode: "business_operator",
      contractor_risk_status:
        "confirmed_contractor",
      lifetime_free_decision_status:
        "reclassified_as_business",
      lifetime_free_decision_reason:
        reason,
      lifetime_free_eligible: false,
      lifetime_free_approved_at: null,
      lifetime_free_approved_by: null,
      classification_reviewed_at: now,
      classification_reviewed_by:
        reviewerId,
      reclassification_reason: reason,
    },
  } as const;
}

export async function POST(req: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  try {
    const body = await req.json();

    const userId = safeString(body?.userId);
    const decisionValue =
      safeString(body?.decision);
    const reason = safeString(body?.reason);
    const reviewerNotes =
      safeString(body?.reviewerNotes);

    if (!userId) {
      return NextResponse.json(
        { error: "Applicant is required." },
        { status: 400 }
      );
    }

    if (!isDecision(decisionValue)) {
      return NextResponse.json(
        { error: "Invalid review decision." },
        { status: 400 }
      );
    }

    if (reason.length < 8) {
      return NextResponse.json(
        {
          error:
            "A clear review reason of at least 8 characters is required.",
        },
        { status: 400 }
      );
    }

    const { admin, user: reviewer } =
      access;

    const { data: profile, error } =
      await admin
        .from(
          "individual_professional_profiles"
        )
        .select(
          [
            "user_id",
            "primary_skill_key",
            "economic_mode",
            "worker_declaration_accepted",
            "original_name_warning_accepted",
            "contractor_risk_status",
            "verification_status",
            "selfie_verification_status",
            "work_evidence_verification_status",
            "identity_name_match_status",
            "ai_verification_status",
            "ai_confidence",
            "ai_result_json",
            "lifetime_free_eligible",
            "lifetime_free_decision_status",
            "lifetime_free_decision_reason",
            "verified_selfie_json",
            "work_photo_one_json",
            "work_photo_two_json",
          ].join(",")
        )
        .eq("user_id", userId)
        .maybeSingle<ProfessionalProfile>();

    if (error) {
      throw error;
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Individual professional profile not found.",
        },
        { status: 404 }
      );
    }

    const transition = buildTransition(
      decisionValue,
      profile,
      reviewer.id,
      reason
    );

    if ("error" in transition) {
      return NextResponse.json(
        {
          error: transition.error,
          failures: transition.failures,
        },
        { status: 409 }
      );
    }

    const evidenceSnapshot = {
      verifiedSelfie:
        profile.verified_selfie_json || {},
      workPhotoOne:
        profile.work_photo_one_json || {},
      workPhotoTwo:
        profile.work_photo_two_json || {},
    };

    const profileSnapshot = {
      primarySkillKey:
        profile.primary_skill_key,
      economicMode:
        profile.economic_mode,
      workerDeclarationAccepted:
        profile.worker_declaration_accepted,
      originalNameWarningAccepted:
        profile.original_name_warning_accepted,
      selfieVerificationStatus:
        profile.selfie_verification_status,
      workEvidenceVerificationStatus:
        profile.work_evidence_verification_status,
      identityNameMatchStatus:
        profile.identity_name_match_status,
      contractorRiskStatus:
        profile.contractor_risk_status,
      aiVerificationStatus:
        profile.ai_verification_status,
      aiConfidence:
        profile.ai_confidence,
    };

    const { data: updatedProfile, error: rpcError } =
      await admin.rpc(
        "apply_individual_professional_review",
        {
          p_user_id: userId,
          p_reviewer_id: reviewer.id,
          p_decision: decisionValue,
          p_reason: reason,
          p_reviewer_notes:
            reviewerNotes || "",
          p_profile_update:
            transition.update,
          p_ai_snapshot:
            profile.ai_result_json || {},
          p_evidence_snapshot:
            evidenceSnapshot,
          p_profile_snapshot:
            profileSnapshot,
        }
      );

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({
      ok: true,
      decision: decisionValue,
      userId,
      profile: updatedProfile,
      lifetimeFreeEligible:
        transition.update
          .lifetime_free_eligible,
      nextVerificationStatus:
        transition.update
          .verification_status,
      nextDecisionStatus:
        transition.update
          .lifetime_free_decision_status,
    });
  } catch (error: any) {
    console.error(
      "INDIVIDUAL_PROFESSIONAL_HUMAN_REVIEW_FAILED",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Human review could not be completed.",
      },
      { status: 500 }
    );
  }
}

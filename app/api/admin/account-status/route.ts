import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

const DEACTIVATION_REASONS: Record<string, string> = {
  policy_violation: "Terms or policy violation",
  suspicious_activity: "Fraud or suspicious activity",
  verification_failed: "Identity or document verification failed",
  payment_issue: "Subscription or payment issue",
  duplicate_account: "Duplicate account",
  user_request: "Deactivated at the user's request",
  inactive_account: "Inactive or abandoned account",
  legal_request: "Legal or regulatory request",
  security_risk: "Account security risk",
};

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await req.formData();
  const userId = String(form.get("user_id") || "");
  const action = String(form.get("action") || "");
  const restrictionMode = String(form.get("restriction_mode") || "suspend");
  const reasonCode = String(form.get("reason_code") || "").trim();
  const customReason = String(form.get("custom_reason") || "").trim();
  const reactivationNote = String(form.get("reason") || "").trim();
  if (!userId || !["activate", "deactivate"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (action === "deactivate" && !["suspend", "re_register", "permanent"].includes(restrictionMode)) {
    return NextResponse.json({ error: "Select a valid account restriction." }, { status: 400 });
  }
  if (userId === access.user.id) return NextResponse.json({ error: "You cannot deactivate your own administrator account." }, { status: 400 });

  const { data: target } = await access.admin.from("profiles").select("role,account_status").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (target.role === "master_admin") return NextResponse.json({ error: "Master administrator accounts cannot be changed here." }, { status: 400 });

  const deactivating = action === "deactivate";
  const reason = deactivating
    ? reasonCode === "other"
      ? customReason
      : DEACTIVATION_REASONS[reasonCode] || ""
    : reactivationNote;
  if (deactivating && !reason) {
    return NextResponse.json({ error: "Select a deactivation reason or enter a custom reason." }, { status: 400 });
  }
  const nextStatus = !deactivating
    ? "active"
    : restrictionMode === "re_register"
      ? "re_registration_required"
      : restrictionMode === "permanent"
        ? "permanently_blocked"
        : "deactivated";
  const shouldBan = nextStatus === "deactivated" || nextStatus === "permanently_blocked";
  const { error: authError } = await access.admin.auth.admin.updateUserById(userId, {
    ban_duration: shouldBan ? "876000h" : "none",
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const profilePatch: Record<string, unknown> = {
    account_status: nextStatus,
    account_status_reason: reason || null,
    account_status_changed_at: new Date().toISOString(),
    account_status_changed_by: access.user.id,
  };
  if (nextStatus === "re_registration_required") {
    Object.assign(profilePatch, {
      role: null,
      requested_role: null,
      is_vendor: false,
      onboarding_completed: false,
      onboarding_version: null,
      portal_use_reason: null,
      role_display_label: null,
      approval_status: "pending",
      approved_by: null,
      approved_at: null,
      rejection_reason: null,
    });
  }
  const { error } = await access.admin.from("profiles").update(profilePatch).eq("id", userId);
  if (error) {
    const wasBlocked = target.account_status === "deactivated" || target.account_status === "permanently_blocked";
    await access.admin.auth.admin.updateUserById(userId, {
      ban_duration: wasBlocked ? "876000h" : "none",
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const auditAction = !deactivating
    ? "activate"
    : restrictionMode === "re_register"
      ? "require_re_registration"
      : restrictionMode === "permanent"
        ? "permanent_block"
        : "deactivate";
  await access.admin.from("admin_account_action_audit").insert({
    target_user_id: userId, admin_user_id: access.user.id, action: auditAction, reason: reason || null,
  });
  return new NextResponse(null, { status: 303, headers: { Location: "/admin/users" } });
}

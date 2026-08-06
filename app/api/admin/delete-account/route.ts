import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

function redirectToMember(
  request: Request,
  memberId: string,
  kind: "success" | "error",
  message: string
) {
  const forwardedHost =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");

  const forwardedProto =
    request.headers.get("x-forwarded-proto") ||
    "https";

  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;

  const url = new URL("/admin/users", origin);

  if (memberId) {
    url.searchParams.set("member", memberId);
    url.searchParams.set("workspace", "controls");
  }

  url.searchParams.set(kind, message);

  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const form = await request.formData();

  const userId = String(
    form.get("user_id") || ""
  ).trim();

  const deletionReason = String(
    form.get("deletion_reason") || ""
  ).trim();

  const confirmation = String(
    form.get("confirmation") || ""
  ).trim();

  const permanentAcknowledgement =
    String(
      form.get("permanent_acknowledgement") ||
        ""
    ) === "yes";

  if (!userId) {
    return NextResponse.json(
      { error: "Member ID is required." },
      { status: 400 }
    );
  }

  if (userId === access.user.id) {
    return redirectToMember(
      request,
      userId,
      "error",
      "You cannot delete your own administrator account."
    );
  }

  if (deletionReason.length < 10) {
    return redirectToMember(
      request,
      userId,
      "error",
      "Enter a clear deletion reason of at least 10 characters."
    );
  }

  if (!permanentAcknowledgement) {
    return redirectToMember(
      request,
      userId,
      "error",
      "Confirm that you understand this deletion is permanent."
    );
  }

  const [
    profileResult,
    businessResult,
    professionalResult,
    authResult,
  ] = await Promise.all([
    access.admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),

    access.admin
      .from("business_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),

    access.admin
      .from("individual_professional_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),

    access.admin.auth.admin.getUserById(
      userId
    ),
  ]);

  const profile = profileResult.data;
  const business = businessResult.data;
  const professional =
    professionalResult.data;
  const authUser = authResult.data?.user;

  if (!profile && !authUser) {
    return redirectToMember(
      request,
      "",
      "error",
      "The account no longer exists."
    );
  }

  const targetRole = String(
    profile?.role ||
      authUser?.user_metadata?.role ||
      ""
  );

  if (targetRole === "master_admin") {
    return redirectToMember(
      request,
      userId,
      "error",
      "Master administrator accounts cannot be deleted from Member Administration."
    );
  }

  const targetEmail = String(
    authUser?.email ||
      profile?.email ||
      ""
  ).trim();

  const targetPhone = String(
    authUser?.phone ||
      profile?.phone ||
      ""
  ).trim();

  const acceptedConfirmations = new Set([
    "DELETE",
    targetEmail,
    targetPhone,
  ]);

  if (
    !acceptedConfirmations.has(
      confirmation
    )
  ) {
    return redirectToMember(
      request,
      userId,
      "error",
      "Type DELETE, the member email, or the member phone number exactly."
    );
  }

  const auditRecord = {
    deleted_user_id: userId,
    deleted_email:
      targetEmail || null,
    deleted_phone:
      targetPhone || null,
    deleted_name:
      profile?.full_name || null,

    deletion_reason: deletionReason,
    confirmation_value:
      confirmation === "DELETE"
        ? "DELETE"
        : "member_identity_confirmed",

    deleted_by: access.user.id,

    profile_snapshot:
      profile || {},

    business_snapshot: {
      business: business || {},
      individualProfessional:
        professional || {},
    },

    auth_snapshot: {
      id: authUser?.id || userId,
      email: targetEmail || null,
      phone: targetPhone || null,
      createdAt:
        authUser?.created_at || null,
      lastSignInAt:
        authUser?.last_sign_in_at ||
        null,
      appMetadata:
        authUser?.app_metadata || {},
      userMetadata:
        authUser?.user_metadata || {},
    },

    deletion_status: "started",
  };

  const { data: audit, error: auditError } =
    await access.admin
      .from(
        "admin_account_deletion_audit"
      )
      .insert(auditRecord)
      .select("id")
      .single();

  if (auditError || !audit?.id) {
    return redirectToMember(
      request,
      userId,
      "error",
      auditError?.message ||
        "Deletion audit could not be created."
    );
  }

  /*
   * Authentication deletion is the canonical destructive action.
   * Tables correctly linked to auth.users with ON DELETE CASCADE
   * will be removed automatically.
   */
  const { error: deleteError } =
    await access.admin.auth.admin.deleteUser(
      userId
    );

  if (deleteError) {
    await access.admin
      .from(
        "admin_account_deletion_audit"
      )
      .update({
        deletion_status: "failed",
        failure_reason:
          deleteError.message,
      })
      .eq("id", audit.id);

    return redirectToMember(
      request,
      userId,
      "error",
      `Account deletion failed: ${deleteError.message}`
    );
  }

  await access.admin
    .from(
      "admin_account_deletion_audit"
    )
    .update({
      deletion_status: "completed",
      failure_reason: null,
    })
    .eq("id", audit.id);

  return redirectToMember(
    request,
    "",
    "success",
    "The account was permanently deleted. The person may now register again."
  );
}

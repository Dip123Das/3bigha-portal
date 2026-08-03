import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

const ALLOWED_PLANS = new Set([
  "basic_vendor",
  "growth",
  "enterprise",
  "lifetime",
]);

function adminReturnOrigin(req: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Continue to trusted forwarded headers.
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://3bigha.com";
  }

  return new URL(req.url).origin;
}

function back(req: Request, key: "success" | "error", message: string) {
  const url = new URL("/admin/users", adminReturnOrigin(req));
  url.searchParams.set(key, message);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return back(
      req,
      "error",
      access.error || "Master-admin access is required."
    );
  }

  const form = await req.formData();
  const userId = String(form.get("user_id") || "").trim();
  const plan = String(form.get("plan") || "").trim().toLowerCase();
  const reason = String(form.get("reason") || "").trim();
  const expiresOn = String(form.get("expires_on") || "").trim();

  if (!userId || !ALLOWED_PLANS.has(plan) || reason.length < 3) {
    return back(
      req,
      "error",
      "Member, valid plan and internal reason are required."
    );
  }

  if (userId === access.user.id) {
    return back(req, "error", "The active master-admin account cannot be changed here.");
  }

  const expiresAt =
    plan === "lifetime" || !expiresOn
      ? null
      : new Date(`${expiresOn}T23:59:59.999Z`).toISOString();

  const userResult = await access.admin.auth.admin.getUserById(userId);

  if (userResult.error || !userResult.data.user) {
    return back(
      req,
      "error",
      userResult.error?.message || "Member authentication record was not found."
    );
  }

  const previousAppMetadata = userResult.data.user.app_metadata || {};
  const grantedAt = new Date().toISOString();

  const metadataResult = await access.admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...previousAppMetadata,
      complimentary_subscription: {
        active: true,
        plan,
        reason,
        expires_at: expiresAt,
        granted_at: grantedAt,
        granted_by: access.user.id,
      },
    },
  });

  if (metadataResult.error) {
    return back(req, "error", metadataResult.error.message);
  }

  const businessResult = await access.admin
    .from("business_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!businessResult.error && businessResult.data) {
    const updateResult = await access.admin
      .from("business_profiles")
      .update({
        subscription_plan: plan,
        subscription_status: "active",
        subscription_expires_at: expiresAt,
      })
      .eq("user_id", userId);

    if (updateResult.error) {
      return back(
        req,
        "error",
        `Complimentary access recorded, but business subscription sync failed: ${updateResult.error.message}`
      );
    }
  }

  return back(
    req,
    "success",
    `Complimentary ${plan.replaceAll("_", " ")} access granted.`
  );
}

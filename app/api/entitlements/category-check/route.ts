import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { categoryUpgradeMessage, type OperatingProfile } from "@/lib/3bos/entitlements/category";

export const dynamic = "force-dynamic";

type CategoryEntitlementResult = {
  allowed: boolean;
  reason: string;
  operating_profile: OperatingProfile;
  category_limit: number | null;
  current_count: number;
  recommended_plan: string;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient(cookies());
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const identityKey = String(body?.identityKey || "").trim();
  if (!identityKey) return NextResponse.json({ ok: false, error: "A category is required" }, { status: 400 });

  const { data: rawData, error } = await supabase.rpc("check_category_entitlement", { p_identity_key: identityKey }).maybeSingle();
  const data = rawData as CategoryEntitlementResult | null;
  if (error) return NextResponse.json({ ok: false, error: "Could not verify category entitlement" }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, allowed: false, reason: "OPERATING_PROFILE_REQUIRED", upgradeUrl: "/auth/register-role" }, { status: 403 });

  if (!data.allowed) {
    return NextResponse.json({
      ok: true,
      allowed: false,
      reason: data.reason,
      message: categoryUpgradeMessage({
        currentLabel: body?.currentLabel,
        requestedLabel: body?.requestedLabel,
        profile: data.operating_profile as OperatingProfile,
      }),
      recommendedPlan: data.recommended_plan,
      upgradeUrl: `/dashboard/subscription?focus=${encodeURIComponent(data.recommended_plan || "growth")}`,
    }, { status: 403 });
  }

  return NextResponse.json({ ok: true, allowed: true, reason: data.reason, operatingProfile: data.operating_profile });
}

import { NextResponse } from "next/server";
import { reconcileOrder } from "@/lib/payments/reconcile-order";
import { paymentUser } from "@/lib/payments/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { razorpayReady } from "@/lib/payments/razorpay";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await paymentUser();
  if (!user)
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const admin = getSupabaseAdmin();
    const [
      profile,
      grants,
      projects,
      orders,
      controls,
      constructionProjects,
      builderProjects,
      manufacturingCapability,
      projectCapability,
    ] = await Promise.all([
      admin
        .from("business_profiles")
        .select("subscription_plan,subscription_status,subscription_expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("commercial_entitlements")
        .select(
          "id,product,kind,resource_id,allowance,starts_at,ends_at,revoked_at,source",
        )
        .eq("user_id", user.id)
        .is("revoked_at", null),
      admin
        .from("bos_cost_plans")
        .select("id,title,operating_mode,status")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      admin
        .from("commercial_orders")
        .select(
          "id,label,amount_paise,gateway_mode,status,created_at,paid_at,refunded_paise,gateway_payment_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("commercial_controls")
        .select("enforcement_enabled")
        .eq("id", true)
        .single(),
      admin
        .from("construction_projects")
        .select("id,title,status")
        .eq("user_id", user.id)
        .not("status", "in", "(completed,cancelled)"),
      admin
        .from("builder_projects")
        .select("id,name,builder_profiles!inner(owner_user_id)")
        .eq("builder_profiles.owner_user_id", user.id),
      admin.rpc("commercial_operating_capability", {
        p_user: user.id,
        p_capability: "product_costing",
      }),
      admin.rpc("commercial_operating_capability", {
        p_user: user.id,
        p_capability: "project_costing",
      }),
    ]);
    if (
      [
        profile,
        grants,
        projects,
        orders,
        controls,
        constructionProjects,
        builderProjects,
        manufacturingCapability,
        projectCapability,
      ].some((r) => r.error)
    )
      throw new Error("Billing data unavailable");
    return NextResponse.json(
      {
        ok: true,
        profile: profile.data,
        entitlements: grants.data,
        projects: projects.data,
        purchases: orders.data,
        gatewayReady:
          razorpayReady() &&
          (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") ||
            controls.data?.enforcement_enabled === true),
        enforcementEnabled: controls.data?.enforcement_enabled,
        constructionProjects: constructionProjects.data,
        builderProjects: builderProjects.data,
        testMode: process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_"),
        capabilities: {
          manufacturing: manufacturingCapability.data === true,
          construction: projectCapability.data === true,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Billing workspace is temporarily unavailable. Your existing records are preserved.",
      },
      { status: 503 },
    );
  }
}
// Recheck captured receipts after identity approval, without requiring a second payment.
export async function POST(req: Request) {
  const user = await paymentUser();
  if (!user)
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const { data: order } = await getSupabaseAdmin()
      .from("commercial_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", String(body.purchaseId || ""))
      .maybeSingle();
    if (!order?.gateway_order_id)
      return NextResponse.json(
        { error: "No provider order recorded." },
        { status: 409 },
      );
    return NextResponse.json({ ok: true, status: await reconcileOrder(order) });
  } catch {
    return NextResponse.json(
      {
        error:
          "Review remains pending. Please contact support; do not pay again.",
      },
      { status: 409 },
    );
  }
}

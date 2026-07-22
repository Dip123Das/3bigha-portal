import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { trackVendorApproved } from "@/lib/marketplace/vendor-conversion-analytics";

const APPROVABLE_ROLES = new Set(["buyer","vendor","builder","hub_vendor","blogger","banker","finance_banker","investor"]);

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const form = await req.formData();
  const userId = String(form.get("user_id") || "");
  const role = String(form.get("role") || "");
  if (!userId || !APPROVABLE_ROLES.has(role)) return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });

  const { error } = await access.admin.from("profiles").update({
    role, approval_status: "approved", approved_by: access.user.id,
    approved_at: new Date().toISOString(), rejection_reason: null,
  }).eq("id", userId).neq("role", "master_admin");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (["vendor","builder","hub_vendor","blogger"].includes(role)) await trackVendorApproved({ userId, metadata: { role, approvedBy: access.user.id, source: "admin_approve_user" } });
  return new NextResponse(null, { status: 303, headers: { Location: "/admin/users" } });
}

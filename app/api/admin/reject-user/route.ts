import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const form = await req.formData();
  const userId = String(form.get("user_id") || "");
  const reason = String(form.get("reason") || "").trim();
  if (!userId) return NextResponse.json({ error: "Invalid rejection request" }, { status: 400 });
  const { error } = await access.admin.from("profiles").update({ approval_status: "rejected", rejection_reason: reason || null }).eq("id", userId).neq("role", "master_admin");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL("/admin/users", req.url), 303);
}

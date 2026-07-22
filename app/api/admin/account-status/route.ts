import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const form = await req.formData();
  const userId = String(form.get("user_id") || "");
  const action = String(form.get("action") || "");
  const reason = String(form.get("reason") || "").trim();
  if (!userId || !["activate", "deactivate"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (userId === access.user.id) return NextResponse.json({ error: "You cannot deactivate your own administrator account." }, { status: 400 });

  const { data: target } = await access.admin.from("profiles").select("role,account_status").eq("id", userId).maybeSingle();
  if (!target) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (target.role === "master_admin") return NextResponse.json({ error: "Master administrator accounts cannot be changed here." }, { status: 400 });

  const deactivating = action === "deactivate";
  const nextStatus = deactivating ? "deactivated" : "active";
  const { error: authError } = await access.admin.auth.admin.updateUserById(userId, {
    ban_duration: deactivating ? "876000h" : "none",
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error } = await access.admin.from("profiles").update({
    account_status: nextStatus,
    account_status_reason: reason || null,
    account_status_changed_at: new Date().toISOString(),
    account_status_changed_by: access.user.id,
  }).eq("id", userId);
  if (error) {
    await access.admin.auth.admin.updateUserById(userId, {
      ban_duration: deactivating ? "none" : "876000h",
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await access.admin.from("admin_account_action_audit").insert({
    target_user_id: userId, admin_user_id: access.user.id, action, reason: reason || null,
  });
  return NextResponse.redirect(new URL("/admin/users", req.url), 303);
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const formData = await req.formData();

  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role"));

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: admin } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (admin?.role !== "master_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabase
    .from("profiles")
    .update({
      role,
      approval_status: "approved",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return NextResponse.redirect(new URL("/admin/users", req.url));
}
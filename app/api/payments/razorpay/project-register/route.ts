import { NextResponse } from "next/server";
import { paymentUser } from "@/lib/payments/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export async function POST(req: Request) {
  const user = await paymentUser();
  if (!user)
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  try {
    const body = await req.json();
    const { data, error } = await getSupabaseAdmin().rpc(
      "link_commercial_project_register",
      {
        p_user: user.id,
        p_project: String(body.projectId || ""),
        p_type: String(body.projectType || ""),
      },
    );
    if (error)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ ok: true, registerId: data });
  } catch {
    return NextResponse.json(
      { error: "Could not link your project register." },
      { status: 400 },
    );
  }
}

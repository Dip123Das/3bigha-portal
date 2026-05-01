import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const conversationId = params.conversationId;

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { persistSession: false },
    });

    const { error } = await admin
      .from("conversations")
      .update({
        is_closed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
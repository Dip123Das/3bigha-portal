import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    conversationId: string;
  };
};

export async function POST(
  req: Request,
  { params }: RouteContext
) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = decodeURIComponent(params.conversationId || "");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const {
      userId,
      isTyping = false,
    } = body || {};

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId." },
        { status: 400 }
      );
    }

    const result = await supabase
      .from("conversation_participants")
      .update({
        is_typing: !!isTyping,
        typing_updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Failed to update typing status." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: result.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update typing state." },
      { status: 500 }
    );
  }
}
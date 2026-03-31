import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    conversationId: string;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function cleanId(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const conversationId = cleanId(decodeURIComponent(params.conversationId || ""));

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
    }

    if (!isUuid(conversationId)) {
      return NextResponse.json({ error: "Invalid conversationId." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const userId = cleanId(body?.userId);
    const lastSeenMessageIdRaw = cleanId(body?.lastSeenMessageId);
    const lastSeenMessageId = lastSeenMessageIdRaw || null;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    if (!isUuid(userId)) {
      return NextResponse.json({ error: "Invalid userId." }, { status: 400 });
    }

    if (lastSeenMessageId && !isUuid(lastSeenMessageId)) {
      return NextResponse.json({ error: "Invalid lastSeenMessageId." }, { status: 400 });
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (String(user.id) !== userId) {
      return NextResponse.json(
        { error: "You can only update your own seen status." },
        { status: 403 }
      );
    }

    const convRes = await supabase
      .from("conversations")
      .select("id,buyer_user_id,vendor_user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convRes.error) {
      return NextResponse.json(
        { error: convRes.error.message || "Failed to validate conversation." },
        { status: 500 }
      );
    }

    const conv = convRes.data;

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }

    const isBuyer = String(conv.buyer_user_id ?? "") === String(user.id);
    const isVendor = String(conv.vendor_user_id ?? "") === String(user.id);

    if (!isBuyer && !isVendor) {
      return NextResponse.json(
        { error: "You are not a participant of this conversation." },
        { status: 403 }
      );
    }

    const role = isBuyer ? "buyer" : "vendor";
    const nowIso = new Date().toISOString();

    const participantRes = await supabase
      .from("conversation_participants")
      .select("last_seen_message_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (participantRes.error) {
      return NextResponse.json(
        { error: participantRes.error.message || "Failed to load participant state." },
        { status: 500 }
      );
    }

    let safeLastSeenMessageId: string | null =
      String(participantRes.data?.last_seen_message_id ?? "").trim() || null;

    if (lastSeenMessageId) {
      const messageRes = await supabase
        .from("conversation_messages")
        .select("id,conversation_id")
        .eq("id", lastSeenMessageId)
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (messageRes.error) {
        return NextResponse.json(
          { error: messageRes.error.message || "Failed to validate last seen message." },
          { status: 500 }
        );
      }

      if (!messageRes.data) {
        return NextResponse.json(
          { error: "Last seen message not found in this conversation." },
          { status: 400 }
        );
      }

      safeLastSeenMessageId = lastSeenMessageId;
    }

    const existingLastReadAt = String(
      (participantRes.data as any)?.last_read_at ?? ""
    ).trim();

    if (
      participantRes.data &&
      !lastSeenMessageId &&
      existingLastReadAt
    ) {
      return NextResponse.json({
        ok: true,
        item: {
          conversation_id: conversationId,
          user_id: user.id,
          role,
          last_read_at: existingLastReadAt,
          last_seen_message_id: safeLastSeenMessageId,
        },
        last_read_at: existingLastReadAt,
        last_seen_message_id: safeLastSeenMessageId ?? null,
      });
    }

    const upsertPayload: Record<string, any> = {
      conversation_id: conversationId,
      user_id: user.id,
      role,
      last_read_at: nowIso,
      last_seen_message_id: safeLastSeenMessageId,
    };

    const result = await supabase
      .from("conversation_participants")
      .upsert(upsertPayload, {
        onConflict: "conversation_id,user_id",
      })
      .select("conversation_id,user_id,role,last_read_at,last_seen_message_id")
      .maybeSingle();

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Failed to update seen status." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: result.data,
      last_read_at: result.data?.last_read_at ?? nowIso,
      last_seen_message_id:
        result.data?.last_seen_message_id ?? safeLastSeenMessageId ?? null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to mark conversation as seen." },
      { status: 500 }
    );
  }
}
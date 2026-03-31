import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ensureConversation } from "@/lib/conversations/ensureConversation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: unknown) {
  return UUID_RE.test(String(v ?? "").trim());
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json();

    const {
      contextType,
      contextId,
      vendorUserId,
      title,
      contextSnapshot,
      rfqId,
      listingId,
      propertyId,
      serviceId,
      rentalId,
      starterMessage,
    } = body || {};

    if (!contextType || !contextId || !vendorUserId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!isUuid(contextId)) {
      return NextResponse.json(
        { error: "Invalid context id." },
        { status: 400 }
      );
    }

    if (!isUuid(vendorUserId)) {
      return NextResponse.json(
        { error: "Invalid vendor user id." },
        { status: 400 }
      );
    }

    if (rfqId && !isUuid(rfqId)) {
      return NextResponse.json({ error: "Invalid rfq id." }, { status: 400 });
    }

    if (listingId && !isUuid(listingId)) {
      return NextResponse.json({ error: "Invalid listing id." }, { status: 400 });
    }

    if (propertyId && !isUuid(propertyId)) {
      return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
    }

    if (serviceId && !isUuid(serviceId)) {
      return NextResponse.json({ error: "Invalid service id." }, { status: 400 });
    }

    if (rentalId && !isUuid(rentalId)) {
      return NextResponse.json({ error: "Invalid rental id." }, { status: 400 });
    }

    if (user.id === vendorUserId) {
      return NextResponse.json(
        { error: "Buyer and vendor cannot be the same user." },
        { status: 400 }
      );
    }

    const result = await ensureConversation(supabase, {
      contextType,
      contextId,
      buyerUserId: user.id,
      vendorUserId,
      title,
      contextSnapshot,
      rfqId,
      listingId,
      propertyId,
      serviceId,
      rentalId,
      starterMessage,
    });

    if (!result?.conversationId || !isUuid(result.conversationId)) {
      return NextResponse.json(
        { error: "Conversation was not created correctly." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversationId: result.conversationId,
      created: result.created,
      chatUrl: result.chatUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to ensure conversation." },
      { status: 500 }
    );
  }
}
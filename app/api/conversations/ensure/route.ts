import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { ensureConversation } from "@/lib/conversations/ensureConversation";
import type { ConversationContextType } from "@/types/conversation";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function isUuid(v: unknown) {
  return UUID_RE.test(String(v ?? "").trim());
}

function getSubscriptionPriority(bp: any) {
  const plan = String(bp?.subscription_plan || "free");
  const status = String(bp?.subscription_status || "free");

  const expiresAt = bp?.subscription_expires_at
    ? new Date(bp.subscription_expires_at).getTime()
    : 0;

  const active =
    status === "active" &&
    (!bp?.subscription_expires_at ||
      (Number.isFinite(expiresAt) && expiresAt > Date.now()));

  if (!active) return 0;

  if (plan === "hub_vendor") return 20;
  if (plan === "premium_vendor") return 10;
  if (plan === "basic_vendor") return 5;

  return 0;
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

    const rawContextType = body?.contextType || body?.context_type;
    const rawContextId = body?.contextId || body?.context_id;
    const rawVendorUserId = body?.vendorUserId || body?.vendor_user_id;

    const item = String(body?.item || "").trim();
    const location = String(body?.location || "").trim();
    const routing = String(body?.routing || "").trim();

    let contextType = String(rawContextType || "").trim();
    let contextId = String(rawContextId || "").trim();
    let vendorUserId = String(rawVendorUserId || "").trim();

    const title =
      body?.title ||
      (item
        ? `Price lead: ${item}${location ? ` · ${location}` : ""}`
        : undefined);

    const starterMessage =
      body?.starterMessage ||
      body?.starter_message ||
      body?.message ||
      "";

    const rfqId = body?.rfqId || body?.rfq_id;
    const listingId = body?.listingId || body?.listing_id;
    const propertyId = body?.propertyId || body?.property_id;
    const serviceId = body?.serviceId || body?.service_id;
    const rentalId = body?.rentalId || body?.rental_id;

    const contextSnapshot =
      body?.contextSnapshot ||
      body?.context_snapshot ||
      (item
        ? {
            item,
            location,
            price_min: body?.price_min ?? body?.priceMin ?? null,
            price_max: body?.price_max ?? body?.priceMax ?? null,
            unit: body?.unit ?? null,
            routing: routing || null,
            source: "price_today",
          }
        : undefined);

    if (!contextType && routing === "best_verified_vendor") {
      contextType = "listing";
    }

    if (!vendorUserId && routing === "best_verified_vendor") {
      if (!item) {
        return NextResponse.json(
          { error: "Missing item for vendor routing." },
          { status: 400 }
        );
      }

      const { data: bestRows, error: routeError } = await supabase
        .from("material_price_updates")
        .select("id, created_by, price_min, price_max, verified")
        .eq("verified", true)
        .not("created_by", "is", null)
        .neq("created_by", user.id)
        .ilike("item", `%${item}%`)
        .ilike("location", `%${location}%`)
        .order("price_min", { ascending: true })
        .limit(10);

      if (routeError) {
        return NextResponse.json(
          { error: routeError.message },
          { status: 400 }
        );
      }

      if (!bestRows || bestRows.length === 0) {
        return NextResponse.json(
          { error: "No verified vendor found for this item in this location." },
          { status: 404 }
        );
      }

      const vendorIds = Array.from(
        new Set(
          bestRows
            .map((row: any) => row.created_by)
            .filter((id: any) => isUuid(id))
        )
      );

      const { data: businessRows, error: businessError } = await supabase
        .from("business_profiles")
        .select(
          "user_id,subscription_plan,subscription_status,subscription_expires_at"
        )
        .in("user_id", vendorIds);

      if (businessError) {
        return NextResponse.json(
          { error: businessError.message },
          { status: 400 }
        );
      }

      const businessByUserId = new Map(
        (businessRows || []).map((bp: any) => [bp.user_id, bp])
      );

      // 🧠 SMART SCORING + SUBSCRIPTION PRIORITY
      const scored = bestRows.map((row: any) => {
        const priceScore = row.price_min ? 1000 / row.price_min : 0;
        const trustScore = row.verified ? 50 : 0;

        const subscriptionPriority = getSubscriptionPriority(
          businessByUserId.get(row.created_by)
        );

        const subscriptionScore = subscriptionPriority * 100;

        return {
          ...row,
          boostPriority: subscriptionPriority,
          totalScore: priceScore + trustScore + subscriptionScore,
        };
      });

      const bestRow = scored.sort((a: any, b: any) => {
        if (b.boostPriority !== a.boostPriority) {
          return b.boostPriority - a.boostPriority;
        }

        return b.totalScore - a.totalScore;
      })[0];

      if (!bestRow?.created_by || !isUuid(bestRow.created_by)) {
        return NextResponse.json(
          { error: "No valid vendor found after scoring." },
          { status: 404 }
        );
      }

      vendorUserId = bestRow.created_by;
      contextId = bestRow.id;
    }

    if (!contextType || !vendorUserId) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (!contextId || !isUuid(contextId)) {
      contextId = crypto.randomUUID();
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
      contextType: contextType as ConversationContextType,
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
      vendorUserId,
      routed: routing === "best_verified_vendor",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to ensure conversation." },
      { status: 500 }
    );
  }
}
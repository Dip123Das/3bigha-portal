// app/api/vendor/rfq/[rfqId]/delivery-update/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: { rfqId: string } }) {
  const rfqId = decodeURIComponent(params.rfqId || "");

  if (!UUID_RE.test(rfqId)) {
    return NextResponse.json({ error: "Invalid RFQ ID" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient(cookies());

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const quoteId = body?.quote_id ? String(body.quote_id) : null;
  const status = String(body?.status ?? "").trim();
  const message = String(body?.message ?? "").trim() || null;
  const expectedDispatchDate = body?.expected_dispatch_date
    ? String(body.expected_dispatch_date)
    : null;
  const expectedDeliveryDate = body?.expected_delivery_date
    ? String(body.expected_delivery_date)
    : null;

  const allowedStatuses = new Set([
    "confirmed",
    "processing",
    "ready_to_dispatch",
    "dispatched",
    "delivered",
    "delayed",
  ]);

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid delivery status." }, { status: 400 });
  }

  // verify vendor has accepted target for this RFQ
  const { data: target, error: targetErr } = await supabase
    .from("rfq_targets")
    .select("rfq_id,vendor_user_id,status")
    .eq("rfq_id", rfqId)
    .eq("vendor_user_id", user.id)
    .maybeSingle();

  if (targetErr || !target) {
    return NextResponse.json({ error: "RFQ target not found." }, { status: 404 });
  }

  const targetStatus = String(target.status ?? "").toLowerCase();
  if (!(targetStatus === "accepted" || targetStatus === "won")) {
    return NextResponse.json(
      { error: "Only the accepted vendor can update delivery schedule." },
      { status: 403 }
    );
  }

  // insert delivery update
  const { data: inserted, error: insErr } = await supabase
    .from("rfq_delivery_updates")
    .insert({
      rfq_id: rfqId,
      quote_id: quoteId && UUID_RE.test(quoteId) ? quoteId : null,
      vendor_user_id: user.id,
      status,
      message,
      expected_dispatch_date: expectedDispatchDate,
      expected_delivery_date: expectedDeliveryDate,
    })
    .select("id,created_at")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message ?? "Failed to save delivery update." }, { status: 400 });
  }

  // also push into rfq_messages timeline if conversation exists
  try {
    const { data: conv } = await supabase
      .from("rfq_conversations")
      .select("id")
      .eq("rfq_id", rfqId)
      .eq("vendor_user_id", user.id)
      .maybeSingle();

    if (conv?.id) {
      const parts = [
        `Delivery status updated: ${status}`,
        expectedDispatchDate ? `Dispatch: ${expectedDispatchDate}` : null,
        expectedDeliveryDate ? `Delivery: ${expectedDeliveryDate}` : null,
        message ? `Note: ${message}` : null,
      ].filter(Boolean);

      await supabase.from("rfq_messages").insert({
        conversation_id: conv.id,
        rfq_id: rfqId,
        sender_user_id: user.id,
        sender_role: "vendor",
        message_type: "delivery_update",
        body: parts.join(" | "),
        meta: {
          status,
          expected_dispatch_date: expectedDispatchDate,
          expected_delivery_date: expectedDeliveryDate,
          quote_id: quoteId,
        },
      });
    }
  } catch (e) {
    console.error("delivery update message insert failed:", e);
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    created_at: inserted.created_at,
  });
}
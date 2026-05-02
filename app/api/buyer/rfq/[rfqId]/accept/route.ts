// app/api/buyer/rfq/[rfqId]/accept/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

function wantsJson(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  const ct = req.headers.get("content-type") ?? "";
  return accept.includes("application/json") || ct.includes("application/json");
}

export async function POST(req: Request, { params }: { params: { rfqId: string } }) {
  const rfqId = decodeURIComponent(params.rfqId || "");
  if (!UUID_RE.test(rfqId)) {
    return NextResponse.json({ error: "Invalid RFQ ID" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const { data: uData, error: uErr } = await supabase.auth.getUser();
  if (uErr || !uData?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = uData.user.id;

  let quoteId = "";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = (await req.json().catch(() => null)) as any;
      quoteId = String(body?.quote_id ?? "");
    } else {
      const form = await req.formData();
      quoteId = String(form.get("quote_id") ?? "");
    }
  } catch {
    quoteId = "";
  }

  if (!UUID_RE.test(quoteId)) {
    return NextResponse.json({ error: "Invalid quote_id" }, { status: 400 });
  }

  // RFQ + ownership
  const { data: rfq, error: rfqErr } = await supabase
    .from("rfqs")
    .select("id, status, requester_user_id, created_by, meta, revision_no")
    .eq("id", rfqId)
    .maybeSingle();

  if (rfqErr || !rfq) {
    return NextResponse.json({ error: rfqErr?.message ?? "RFQ not found" }, { status: 404 });
  }

  const ownerOk = rfq.requester_user_id === userId || rfq.created_by === userId;
  if (!ownerOk) {
    return NextResponse.json(
      { error: "You are not allowed to accept quotes for this RFQ." },
      { status: 403 }
    );
  }

  // Quote
  const { data: qt, error: qtErr } = await supabase
    .from("rfq_quotes")
    .select("id, rfq_id, vendor_id, version, updated_at, status")
    .eq("id", quoteId)
    .eq("rfq_id", rfqId)
    .maybeSingle();

  if (qtErr || !qt) {
    return NextResponse.json(
      { error: qtErr?.message ?? "Quote not found for this RFQ" },
      { status: 404 }
    );
  }

  const nowIso = new Date().toISOString();

  // 🧠 SELF EVOLVING AI — LEARNING SIGNAL
  const LEARNING_ENABLED = true;

  // Update RFQ meta/status
  const prevMeta = (rfq.meta ?? {}) as any;
  const nextMeta = {
    ...prevMeta,
    accepted_quote_id: qt.id,
    accepted_vendor_id: qt.vendor_id,
    accepted_quote_version: qt.version ?? null,
    accepted_at: nowIso,
  };

  // 🧠 Identify winner & losers
  const winningVendorId = qt.vendor_id;

  // get all vendors involved
  const { data: allTargets } = await supabase
    .from("rfq_targets")
    .select("vendor_user_id")
    .eq("rfq_id", rfqId);

  const { error: upErr } = await supabase
    .from("rfqs")
    .update({
      meta: nextMeta,
      status: "closed",
      updated_at: nowIso,
    })
    .eq("id", rfqId);

  // 🧠 APPLY LEARNING
  if (LEARNING_ENABLED && winningVendorId && Array.isArray(allTargets)) {
    for (const t of allTargets) {
      const vid = String(t.vendor_user_id || "");
      if (!vid) continue;

      const isWinner = vid === String(winningVendorId);

      await supabase.from("vendor_performance_metrics").upsert(
        {
          user_id: vid,
          total_matches: 1,
          total_selected: isWinner ? 1 : 0,
          total_converted: isWinner ? 1 : 0,
        },
        { onConflict: "user_id" }
      );

      if (isWinner) {
        await supabase.from("vendor_notifications").insert({
          user_id: vid,
          type: "ai_learning_win",
          title: "You were selected 🎯",
          message: "Your profile performed well. AI ranking boosted.",
          is_read: false,
        });
      }
    }
  }

  if (upErr) {
    return NextResponse.json(
      { error: upErr.message ?? "Failed to accept quote." },
      { status: 403 }
    );
  }

  // Update rfq_targets
  let targetUpdateWarning: string | null = null;
  let acceptedVendorUserId: string | null = null;

  try {
    // first try using quote.vendor_id as before
    const candidateVendorUserId = String(qt.vendor_id ?? "");

    const aRes = await supabase
      .from("rfq_targets")
      .update({
        status: "accepted",
        responded_at: nowIso,
        viewed_at: nowIso,
      })
      .eq("rfq_id", rfqId)
      .eq("vendor_user_id", candidateVendorUserId)
      .select("vendor_user_id")
      .maybeSingle();

    if (aRes.error) {
      targetUpdateWarning = aRes.error.message ?? "Could not update rfq_targets (accepted).";
    } else {
      acceptedVendorUserId = aRes.data?.vendor_user_id
        ? String(aRes.data.vendor_user_id)
        : candidateVendorUserId;

      const cRes = await supabase
        .from("rfq_targets")
        .update({
          status: "closed",
          viewed_at: nowIso,
        })
        .eq("rfq_id", rfqId)
        .neq("vendor_user_id", acceptedVendorUserId);

      if (cRes.error) {
        targetUpdateWarning = cRes.error.message ?? "Could not update rfq_targets (close others).";
      }
    }

    // fallback: if acceptedVendorUserId still not found, read accepted target row
    if (!acceptedVendorUserId) {
      const { data: acceptedTarget, error: acceptedTargetErr } = await supabase
        .from("rfq_targets")
        .select("vendor_user_id")
        .eq("rfq_id", rfqId)
        .eq("status", "accepted")
        .maybeSingle();

      if (!acceptedTargetErr && acceptedTarget?.vendor_user_id) {
        acceptedVendorUserId = String(acceptedTarget.vendor_user_id);
      }
    }
  } catch (e: any) {
    targetUpdateWarning = e?.message ?? "Could not update rfq_targets.";
  }

  // Conversation creation
  let conversationWarning: string | null = null;
  let conversationId: string | null = null;

  try {
    const buyerUserId = String(rfq.requester_user_id ?? rfq.created_by ?? "");
    const vendorUserId = String(
      acceptedVendorUserId ?? qt.vendor_id ?? ""
    );

    if (!UUID_RE.test(buyerUserId)) {
      conversationWarning = "Buyer user id is invalid for RFQ conversation.";
    } else if (!UUID_RE.test(vendorUserId)) {
      conversationWarning = "Vendor user id is invalid for RFQ conversation.";
    } else {
      // find existing unified conversation
      const { data: existingConv, error: existingConvErr } = await supabase
        .from("conversations")
        .select("id")
        .eq("context_type", "rfq")
        .eq("rfq_id", rfqId)
        .eq("buyer_user_id", buyerUserId)
        .eq("vendor_user_id", vendorUserId)
        .maybeSingle();

      if (existingConvErr) {
        conversationWarning = existingConvErr.message ?? "Could not check unified conversation.";
      } else if (existingConv?.id) {
        conversationId = String(existingConv.id);

        const { error: touchErr } = await supabase
          .from("conversations")
          .update({
            is_closed: false,
            updated_at: nowIso,
          })
          .eq("id", conversationId);

        if (touchErr) {
          conversationWarning = touchErr.message ?? "Could not update unified conversation.";
        }
      } else {
        const { data: newConv, error: newConvErr } = await supabase
          .from("conversations")
          .insert({
            context_type: "rfq",
            context_id: rfqId,
            rfq_id: rfqId,
            buyer_user_id: buyerUserId,
            vendor_user_id: vendorUserId,
            is_closed: false,
          })
          .select("id")
          .single();

        if (newConvErr) {
          conversationWarning = newConvErr.message ?? "Could not create unified conversation.";
        } else {
          conversationId = String(newConv.id);
        }
      }

      if (conversationId) {
        const { error: participantErr } = await supabase
          .from("conversation_participants")
          .upsert(
            [
              {
                conversation_id: conversationId,
                user_id: buyerUserId,
                role: "buyer",
                last_read_at: nowIso,
              },
              {
                conversation_id: conversationId,
                user_id: vendorUserId,
                role: "vendor",
              },
            ],
            { onConflict: "conversation_id,user_id" }
          );

        if (participantErr && !conversationWarning) {
          conversationWarning =
            participantErr.message ?? "Could not ensure unified conversation participants.";
        }
      }

      // insert system message only if this exact acceptance message is not already there
      if (conversationId) {
        const systemText =
          "Quote accepted. Buyer and vendor can now coordinate here for confirmation, delivery schedule, and updates.";

        const { data: existingMsg, error: existingMsgErr } = await supabase
          .from("conversation_messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("message_type", "system")
          .eq("body", systemText)
          .maybeSingle();

        if (existingMsgErr) {
          if (!conversationWarning) {
            conversationWarning = existingMsgErr.message ?? "Could not check existing system message.";
          }
        } else if (!existingMsg?.id) {
          const { error: msgErr } = await supabase.from("conversation_messages").insert({
            conversation_id: conversationId,
            sender_user_id: buyerUserId,
            sender_role: "system",
            message_type: "system",
            body: systemText,
            meta: {
              rfq_id: rfqId,
              accepted_vendor_id: vendorUserId,
              accepted_at: nowIso,
            },
          });

          if (msgErr && !conversationWarning) {
            conversationWarning = msgErr.message ?? "Could not create initial system message.";
          }
        }
      }
    }
  } catch (e: any) {
    conversationWarning = e?.message ?? "Could not initialize unified conversation.";
  }

    // 🔥 TRACK VENDOR SELECTION
  const selectedVendorUserId = String(acceptedVendorUserId ?? qt.vendor_id ?? "");

  if (UUID_RE.test(selectedVendorUserId)) {
    await supabase.from("vendor_performance_metrics").upsert(
      {
        user_id: selectedVendorUserId,
        total_selected: 1,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  if (wantsJson(req)) {
    return NextResponse.json({
      ok: true,
      rfq_id: rfqId,
      accepted_quote_id: qt.id,
      accepted_vendor_id: acceptedVendorUserId ?? qt.vendor_id,
      conversation_id: conversationId,
      warning: targetUpdateWarning || conversationWarning,
    });
  }

  const redirectUrl = new URL(
    `/dashboard/buyer/quote-compare/${encodeURIComponent(rfqId)}?accepted=1`,
    req.url
  );
  if (targetUpdateWarning) redirectUrl.searchParams.set("warn", "targets");
  if (conversationWarning) redirectUrl.searchParams.set("chat_warn", "1");

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
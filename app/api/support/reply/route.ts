import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function looksLikeWaitingForUser(messageText: string) {
  const text = String(messageText || "").toLowerCase();

  return [
    "send screenshot",
    "share screenshot",
    "provide screenshot",
    "please send",
    "please share",
    "kindly send",
    "kindly share",
    "provide details",
    "share details",
    "send details",
    "confirm",
    "please confirm",
    "kindly confirm",
    "upload",
    "attach",
    "reply with",
  ].some((phrase) => text.includes(phrase));
}

function normalizeStatus(status: string, fallback: string) {
  const allowedStatus = [
    "open",
    "in_review",
    "waiting_user",
    "escalated",
    "resolved",
    "closed",
  ];

  return allowedStatus.includes(status) ? status : fallback;
}

function shouldEscalateFromText(messageText: string) {
  const text = String(messageText || "").toLowerCase();

  return [
    "fraud",
    "scam",
    "cheat",
    "cheated",
    "fake",
    "police",
    "court",
    "lawyer",
    "legal notice",
    "money taken",
    "payment not received",
    "refund not received",
  ].some((phrase) => text.includes(phrase));
}

async function createNotification(
  supabase: any,
  payload: {
    user_id: string;
    type: string;
    priority?: string;
    title: string;
    message: string;
    action_url?: string;
    source_type?: string;
    source_id?: string;
    data?: any;
  }
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: payload.user_id,
    type: payload.type,
    priority: payload.priority || "normal",
    title: payload.title,
    message: payload.message,
    action_url: payload.action_url || null,
    source_type: payload.source_type || "support_ticket",
    source_id: payload.source_id || null,
    data: payload.data || {},
    is_read: false,
  });

  if (error) {
    console.error("Notification insert failed:", error.message);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "Invalid user session." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const ticketId = String(body?.ticketId || "").trim();
    const messageText = String(body?.messageText || "").trim();
    const requestedStatus = String(body?.status || "").trim();

    if (!ticketId) {
      return NextResponse.json(
        { ok: false, error: "Ticket ID is required." },
        { status: 400 }
      );
    }

    if (!messageText || messageText.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Please write a reply before sending." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,requested_role,is_vendor")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(
      profile?.role ||
        profile?.requested_role ||
        (profile?.is_vendor ? "vendor" : "user")
    );

    const isAdmin = role === "master_admin" || role === "admin";

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return NextResponse.json(
        { ok: false, error: "Support ticket not found." },
        { status: 404 }
      );
    }

    if (!isAdmin && ticket.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this ticket." },
        { status: 403 }
      );
    }

    const { data: message, error: msgErr } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_role: role,
        sender_email: user.email || null,
        message_text: messageText,
        is_admin_message: isAdmin,
      })
      .select("*")
      .single();

    if (msgErr || !message) {
      return NextResponse.json(
        { ok: false, error: msgErr?.message || "Failed to send reply." },
        { status: 500 }
      );
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    const currentStatus = String(ticket.status || "open");
    let finalStatus = currentStatus;

    if (isAdmin) {
      let nextStatus = normalizeStatus(requestedStatus, currentStatus);

      const isWaitingRequest = looksLikeWaitingForUser(messageText);

      if (
        isWaitingRequest &&
        nextStatus !== "resolved" &&
        nextStatus !== "closed" &&
        nextStatus !== "escalated"
      ) {
        nextStatus = "waiting_user";
      }

      if (shouldEscalateFromText(messageText) && nextStatus !== "resolved") {
        nextStatus = "escalated";
        updatePayload.escalation_level = Math.max(
          Number(ticket.escalation_level || 0),
          2
        );
      }

      finalStatus = nextStatus;

      updatePayload.admin_reply = messageText;
      updatePayload.admin_id = user.id;
      updatePayload.status = nextStatus;
      updatePayload.waiting_for_user = nextStatus === "waiting_user";

      if (nextStatus === "resolved" || nextStatus === "closed") {
        updatePayload.resolved_at = new Date().toISOString();
        updatePayload.waiting_for_user = false;
      }

      if (nextStatus !== "resolved" && nextStatus !== "closed") {
        updatePayload.resolved_at = null;
      }
    } else {
      updatePayload.waiting_for_user = false;

      if (
        currentStatus === "waiting_user" ||
        currentStatus === "resolved" ||
        currentStatus === "closed"
      ) {
        finalStatus = "open";
        updatePayload.status = "open";
        updatePayload.resolved_at = null;
      }

      if (shouldEscalateFromText(messageText)) {
        finalStatus = "escalated";
        updatePayload.status = "escalated";
        updatePayload.escalation_level = Math.max(
          Number(ticket.escalation_level || 0),
          2
        );

        const lower = String(messageText || "").toLowerCase();

        if (
          lower.includes("police") ||
          lower.includes("court") ||
          lower.includes("lawyer") ||
          lower.includes("legal notice")
        ) {
          updatePayload.ai_risk_flag = "legal_risk";
        } else if (
          lower.includes("payment") ||
          lower.includes("refund") ||
          lower.includes("money")
        ) {
          updatePayload.ai_risk_flag = "payment_risk";
        } else if (
          lower.includes("fraud") ||
          lower.includes("scam") ||
          lower.includes("cheat") ||
          lower.includes("fake")
        ) {
          updatePayload.ai_risk_flag = "fraud_risk";
        }
      }
    }

    const { data: updatedTicket, error: updateErr } = await supabase
      .from("support_tickets")
      .update(updatePayload)
      .eq("id", ticketId)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: updateErr.message },
        { status: 500 }
      );
    }

    if (isAdmin) {
      const notificationType =
        finalStatus === "resolved"
          ? "support_resolved"
          : finalStatus === "closed"
          ? "support_closed"
          : finalStatus === "waiting_user"
          ? "support_waiting_user"
          : finalStatus === "escalated"
          ? "support_escalated"
          : "support_reply";

      await createNotification(supabase, {
        user_id: ticket.user_id,
        type: notificationType,
        priority:
          finalStatus === "escalated"
            ? "high"
            : finalStatus === "resolved" || finalStatus === "closed"
            ? "normal"
            : "normal",
        title:
          finalStatus === "resolved"
            ? "Support ticket resolved"
            : finalStatus === "closed"
            ? "Support ticket closed"
            : finalStatus === "waiting_user"
            ? "Support needs your response"
            : finalStatus === "escalated"
            ? "Support ticket escalated"
            : "New support reply",
        message:
          finalStatus === "resolved"
            ? `Your ticket ${ticket.ticket_no || ""} has been marked resolved.`
            : finalStatus === "closed"
            ? `Your ticket ${ticket.ticket_no || ""} has been closed.`
            : finalStatus === "waiting_user"
            ? `Support replied to ticket ${ticket.ticket_no || ""} and needs your response.`
            : finalStatus === "escalated"
            ? `Your ticket ${ticket.ticket_no || ""} has been escalated for priority review.`
            : `Support replied to ticket ${ticket.ticket_no || ""}.`,
        action_url: `/support/ticket/${ticketId}`,
        source_type: "support_ticket",
        source_id: ticketId,
        data: {
          ticket_no: ticket.ticket_no,
          status: finalStatus,
          is_admin_message: true,
        },
      });
    } else {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id,role,requested_role")
        .or(
          "role.eq.master_admin,role.eq.admin,requested_role.eq.master_admin,requested_role.eq.admin"
        );

      const adminRows = Array.isArray(admins) ? admins : [];

      await Promise.all(
        adminRows
          .filter((admin: any) => admin?.id)
          .map((admin: any) =>
            createNotification(supabase, {
              user_id: admin.id,
              type: finalStatus === "escalated" ? "support_escalated" : "support_user_reply",
              priority: finalStatus === "escalated" ? "high" : "normal",
              title:
                finalStatus === "escalated"
                  ? "Support ticket escalated"
                  : "User replied to support ticket",
              message:
                finalStatus === "escalated"
                  ? `Ticket ${ticket.ticket_no || ""} needs urgent admin review.`
                  : `User replied to ticket ${ticket.ticket_no || ""}.`,
              action_url: `/admin/dashboard/support/${ticketId}`,
              source_type: "support_ticket",
              source_id: ticketId,
              data: {
                ticket_no: ticket.ticket_no,
                status: finalStatus,
                user_id: ticket.user_id,
                is_admin_message: false,
              },
            })
          )
      );
    }

    return NextResponse.json({
      ok: true,
      message,
      ticket: updatedTicket,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Support reply failed." },
      { status: 500 }
    );
  }
}
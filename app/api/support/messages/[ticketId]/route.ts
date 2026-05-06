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

export async function GET(
  req: Request,
  { params }: { params: { ticketId: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const ticketId = String(params?.ticketId || "").trim();

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

    if (!ticketId) {
      return NextResponse.json(
        { ok: false, error: "Ticket ID is required." },
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

    const { data: messages, error: msgErr } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json(
        { ok: false, error: msgErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      isAdmin,
      role,
      ticket,
      messages: messages || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load support messages." },
      { status: 500 }
    );
  }
}
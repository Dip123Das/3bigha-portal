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
    auth: {
      persistSession: false,
    },
  });
}

function makeTicketNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);

  return `TICKET-3B-${y}${m}${day}-${rand}`;
}

function normalizeCategory(value: unknown) {
  const v = String(value || "general").toLowerCase().trim();

  if (
    [
      "login",
      "listing",
      "buy_sell",
      "rfq",
      "chat",
      "payment",
      "vendor",
      "buyer",
      "price",
      "technical",
      "general",
    ].includes(v)
  ) {
    return v;
  }

  return "general";
}

function normalizePriority(value: unknown) {
  const v = String(value || "normal").toLowerCase().trim();

  if (["low", "normal", "high", "urgent"].includes(v)) return v;

  return "normal";
}

export async function GET(req: Request) {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,requested_role,approval_status,is_vendor")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(
      profile?.role ||
        profile?.requested_role ||
        (profile?.is_vendor ? "vendor" : "user")
    );

    const isAdmin = role === "master_admin" || role === "admin";

    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      role,
      isAdmin,
      rows: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load support tickets." },
      { status: 500 }
    );
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

    const originalText = String(body?.originalText || "").trim();
    const aiDraftedText = String(body?.aiDraftedText || originalText).trim();
    const category = normalizeCategory(body?.category);
    const priority = normalizePriority(body?.priority);

    if (!originalText || originalText.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Please write your issue before submitting." },
        { status: 400 }
      );
    }

    if (!aiDraftedText || aiDraftedText.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Final complaint text is missing." },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role,requested_role,approval_status,is_vendor")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = String(
      profile?.role ||
        profile?.requested_role ||
        (profile?.is_vendor ? "vendor" : "user")
    );

    const userDisplayId = `${userRole.toUpperCase()}-${user.id.slice(0, 8)}`;

    let ticketNo = makeTicketNo();

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          ticket_no: ticketNo,
          user_id: user.id,
          user_email: user.email || null,
          user_role: userRole,
          user_display_id: userDisplayId,
          category,
          original_text: originalText,
          ai_drafted_text: aiDraftedText,
          status: "open",
          priority,
        })
        .select("*")
        .single();

      if (!error && data) {
        return NextResponse.json({
          ok: true,
          ticket: data,
          ticketNo,
          message:
            "Your written support ticket has been created. Please track the status using the ticket number.",
        });
      }

      if (!String(error?.message || "").toLowerCase().includes("duplicate")) {
        return NextResponse.json(
          { ok: false, error: error?.message || "Failed to create ticket." },
          { status: 500 }
        );
      }

      ticketNo = makeTicketNo();
    }

    return NextResponse.json(
      { ok: false, error: "Could not generate a unique ticket number." },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Support ticket creation failed." },
      { status: 500 }
    );
  }
}
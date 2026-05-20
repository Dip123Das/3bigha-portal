import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { SmartReengagementNotification } from "@/lib/notifications/smart-reengagement";

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

    const { data: rows, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const list = Array.isArray(rows) ? rows : [];

    const smartRows: SmartReengagementNotification[] = [
      {
        id: "smart-open-dashboard",
        title: "Continue your 3Bigha activity",
        message: "Open your dashboard to review pending requirements, leads, conversations and marketplace opportunities.",
        href: "/dashboard",
        cta: "Open Dashboard",
        priority: list.some((n) => !n.is_read) ? "high" : "normal",
        icon: "🔔",
      },
      {
        id: "smart-marketplace-discovery",
        title: "Explore new marketplace matches",
        message: "Check property, materials, services and rentals based on your recent marketplace activity.",
        href: "/search",
        cta: "Explore",
        priority: "normal",
        icon: "✨",
      },
    ];

    return NextResponse.json({
      ok: true,
      rows: list,
      smartRows,
      unread: list.filter((n) => !n.is_read).length,
      urgent: list.filter(
        (n) => !n.is_read && ["high", "urgent", "critical"].includes(String(n.priority))
      ).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load notifications." },
      { status: 500 }
    );
  }
}
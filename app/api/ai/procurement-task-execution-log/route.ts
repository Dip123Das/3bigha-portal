import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) throw new Error("Supabase admin env missing.");

  return createClient(url, key, { auth: { persistSession: false } });
}

function fallbackLogs() {
  return [
    {
      id: "log-preview-1",
      task: "Escalate inactive RFQ conversation",
      action: "AI follow-up message generated",
      status: "ready",
      priority: "critical",
      mode: "approval-required",
      confidence: 94,
      time: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    },
  ];
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("ai_deal_events")
      .select("id,event_type,payload,created_at")
      .eq("event_type", "autonomous_procurement_execution")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      return NextResponse.json({ ok: true, logs: fallbackLogs() });
    }

    const logs = (data || []).map((row: any) => ({
      id: row.id,
      task: row.payload?.task || row.payload?.actionType || "Autonomous procurement task",
      action: row.payload?.message || row.payload?.action || "AI procurement action executed",
      status: row.payload?.status || "executed",
      priority: row.payload?.priority || "medium",
      mode: row.payload?.mode || "executed",
      confidence: row.payload?.confidence || 70,
      time: row.created_at,
    }));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      logs: logs.length ? logs : fallbackLogs(),
      summary: {
        total: logs.length,
        executed: logs.filter((x: any) => x.status === "executed").length,
        critical: logs.filter((x: any) => x.priority === "critical").length,
      },
      executiveDirective:
        "AI procurement task execution log is now reading persistent Supabase execution events.",
    });
  } catch {
    return NextResponse.json({ ok: true, logs: fallbackLogs() });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const payload = {
      task: String(body?.task || "Autonomous procurement task"),
      action: String(body?.action || "AI procurement action generated"),
      status: String(body?.status || "generated"),
      priority: String(body?.priority || "medium"),
      mode: String(body?.mode || "approval-required"),
      confidence: Number(body?.confidence || 70),
      conversationId: body?.conversationId || null,
      rfqId: body?.rfqId || null,
      loggedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("ai_deal_events")
      .insert({
        conversation_id: payload.conversationId,
        event_type: "autonomous_procurement_execution",
        payload,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      saved: true,
      log: {
        id: data.id,
        ...payload,
        time: data.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to save execution log." },
      { status: 500 }
    );
  }
}
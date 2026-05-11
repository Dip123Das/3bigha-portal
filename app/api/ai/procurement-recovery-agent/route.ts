import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase env missing.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function hoursSince(v?: string | null) {
  if (!v) return 999;

  const ts = new Date(v).getTime();

  if (!Number.isFinite(ts)) return 999;

  return Math.max(
    0,
    Math.round((Date.now() - ts) / (1000 * 60 * 60))
  );
}

function severity(hours: number) {
  if (hours >= 96) return "critical";
  if (hours >= 48) return "high";
  if (hours >= 24) return "medium";
  return "stable";
}

function confidence(hours: number) {
  if (hours >= 96) return 98;
  if (hours >= 72) return 92;
  if (hours >= 48) return 86;
  if (hours >= 24) return 74;
  return 62;
}

function recoveryAction(hours: number) {
  if (hours >= 96) {
    return {
      type: "reroute",
      label:
        "Activate emergency supplier rerouting.",
    };
  }

  if (hours >= 72) {
    return {
      type: "escalate",
      label:
        "Escalate procurement recovery workflow.",
    };
  }

  if (hours >= 48) {
    return {
      type: "follow_up",
      label:
        "Trigger autonomous supplier follow-up.",
    };
  }

  return {
    type: "monitor",
    label:
      "Continue procurement telemetry monitoring.",
  };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: conversations } = await supabase
      .from("conversations")
      .select(
        `
        id,
        rfq_id,
        context_type,
        context_id,
        buyer_user_id,
        vendor_user_id,
        title,
        is_closed,
        created_at,
        updated_at,
        last_message_at
      `
      )
      .or("is_closed.is.null,is_closed.eq.false")
      .order("updated_at", {
        ascending: true,
      })
      .limit(25);

    const recovery = (conversations || []).map(
      (row: any, index: number) => {
        const last =
          row.last_message_at ||
          row.updated_at ||
          row.created_at;

        const staleHours =
          hoursSince(last);

        const sev =
          severity(staleHours);

        const conf =
          confidence(staleHours);

        const action =
          recoveryAction(staleHours);

        return {
          id:
            row.id ||
            `recovery-${index}`,

          title:
            row.title ||
            row.context_type ||
            "Procurement conversation",

          severity: sev,

          confidence: conf,

          staleHours,

          actionType:
            action.type,

          actionLabel:
            action.label,

          recoveryProbability:
            Math.max(
              12,
              100 - staleHours
            ),

          conversationId:
            row.id,

          rfqId:
            row.rfq_id || null,

          recommendation:
            staleHours >= 72
              ? "AI detected procurement recovery risk escalation."
              : staleHours >= 48
              ? "AI detected weakening procurement continuity."
              : "Procurement conversation remains operational.",
        };
      }
    );

    return NextResponse.json({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      recovery,

      summary: {
        total:
          recovery.length,

        critical:
          recovery.filter(
            (x: any) =>
              x.severity ===
              "critical"
          ).length,

        high:
          recovery.filter(
            (x: any) =>
              x.severity ===
              "high"
          ).length,

        escalation:
          recovery.filter(
            (x: any) =>
              x.actionType ===
              "escalate"
          ).length,
      },

      executiveDirective:
        "Procurement Recovery Agent actively monitoring stale operational workflows.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err?.message ||
          "Recovery agent failed.",
      },
      { status: 500 }
    );
  }
}
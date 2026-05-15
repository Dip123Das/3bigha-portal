import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateConstructionAlerts } from "@/lib/construction-cost/construction-alert-engine";
import type { ConstructionRecoveryMilestone } from "@/lib/construction-cost/recovery-types";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

async function loadMilestones(projectId: string) {
  const supabase = getSupabaseServerClient(cookies());

  const { data, error } = await supabase
    .from("construction_project_milestones")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ConstructionRecoveryMilestone[];
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const projectId = context.params.id;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Project id is required." },
        { status: 400 },
      );
    }

    const milestones = await loadMilestones(projectId);
    const alerts = generateConstructionAlerts({ projectId, milestones });

    return NextResponse.json({
      ok: true,
      alerts,
    });
  } catch (error) {
    console.error("Construction alerts GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate construction alerts.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const projectId = context.params.id;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: "Project id is required." },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const milestones = Array.isArray(body?.milestones)
      ? (body.milestones as ConstructionRecoveryMilestone[])
      : await loadMilestones(projectId);

    const alerts = generateConstructionAlerts({ projectId, milestones });

    return NextResponse.json({
      ok: true,
      alerts,
    });
  } catch (error) {
    console.error("Construction alerts POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate construction alerts.",
      },
      { status: 500 },
    );
  }
}

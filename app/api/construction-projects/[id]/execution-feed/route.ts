import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { generateConstructionCommandCenter } from "@/lib/construction-cost/construction-command-center";
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
    const commandCenter = generateConstructionCommandCenter({ projectId, milestones });

    return NextResponse.json({
      ok: true,
      executionFeed: commandCenter.dailyExecutionFeed,
      commandActions: commandCenter.commandActions,
      missionStatus: commandCenter.missionStatus,
      generatedAt: commandCenter.generatedAt,
    });
  } catch (error) {
    console.error("Construction execution feed GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate construction execution feed.",
      },
      { status: 500 },
    );
  }
}

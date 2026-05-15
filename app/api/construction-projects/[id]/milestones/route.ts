import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { generateConstructionMilestonePlan } from "@/lib/construction-cost/milestone-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

function normalizeStatus(value: unknown) {
  if (
    value === "pending" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "delayed" ||
    value === "blocked"
  ) {
    return value;
  }

  return undefined;
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const supabase = getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("construction_project_milestones")
      .select("*")
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .order("sequence", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      milestones: data ?? [],
    });
  } catch (error) {
    console.error("Construction milestones GET error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load milestones." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const supabase = getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    const plan = generateConstructionMilestonePlan({
      projectId: params.id,
      builtUpAreaSqFt:
        typeof body.builtUpAreaSqFt === "number"
          ? body.builtUpAreaSqFt
          : 1000,
      floorCount:
        typeof body.floorCount === "number" ? body.floorCount : 1,
      grade:
        body.grade === "economy" ||
        body.grade === "standard" ||
        body.grade === "premium"
          ? body.grade
          : "standard",
      roomCount:
        typeof body.roomCount === "number" ? body.roomCount : 3,
      bathroomCount:
        typeof body.bathroomCount === "number" ? body.bathroomCount : 2,
      hasInteriorWork: Boolean(body.hasInteriorWork),
      projectStartDate:
        typeof body.projectStartDate === "string"
          ? body.projectStartDate
          : undefined,
    });

    const rows = plan.milestones.map((milestone) => ({
      project_id: params.id,
      user_id: user.id,
      milestone_key: milestone.key,
      title: milestone.title,
      description: milestone.description,
      sequence: milestone.sequence,
      status: milestone.status,
      priority: milestone.priority,
      planned_start_date: milestone.plannedStartDate,
      planned_end_date: milestone.plannedEndDate,
      estimated_days: milestone.estimatedDays,
      progress_percent: milestone.progressPercent,
      vendor_category: milestone.vendorCategory,
      dependency: milestone.dependency,
      ai_risk_note: milestone.aiRiskNote,
    }));

    const { data, error } = await supabase
      .from("construction_project_milestones")
      .upsert(rows, {
        onConflict: "project_id,milestone_key",
      })
      .select("*")
      .order("sequence", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      milestones: data ?? [],
    });
  } catch (error) {
    console.error("Construction milestones POST error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to generate milestones." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const supabase = getSupabaseServerClient(cookies());

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();

    if (typeof body.milestoneKey !== "string") {
      return NextResponse.json(
        { ok: false, error: "milestoneKey is required." },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const status = normalizeStatus(body.status);
    if (status) update.status = status;

    const progress = toNumberOrUndefined(body.progressPercent);
    if (progress !== undefined) {
      update.progress_percent = Math.max(0, Math.min(100, Math.round(progress)));
    }

    if (body.actualStartDate !== undefined) {
      update.actual_start_date =
        typeof body.actualStartDate === "string" ? body.actualStartDate : null;
    }

    if (body.actualEndDate !== undefined) {
      update.actual_end_date =
        typeof body.actualEndDate === "string" ? body.actualEndDate : null;
    }

    const { data, error } = await supabase
      .from("construction_project_milestones")
      .update(update)
      .eq("project_id", params.id)
      .eq("user_id", user.id)
      .eq("milestone_key", body.milestoneKey)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      milestone: data,
    });
  } catch (error) {
    console.error("Construction milestones PATCH error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update milestone." },
      { status: 500 },
    );
  }
}

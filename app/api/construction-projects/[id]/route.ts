import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  normalizeConstructionProjectUpdate,
  type UpdateConstructionProjectPayload,
} from "@/lib/construction-cost/project-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: {
    id: string;
  };
};

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabaseServerClient(cookieStore);

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
      .from("construction_projects")
      .select(
        `
        *,
        construction_project_snapshots (*)
      `,
      )
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      project: data,
    });
  } catch (error) {
    console.error("Construction project GET error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load construction project." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabaseServerClient(cookieStore);

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

    const payload: UpdateConstructionProjectPayload = {
      title: typeof body.title === "string" ? body.title : undefined,
      city: typeof body.city === "string" ? body.city : undefined,
      locality: typeof body.locality === "string" ? body.locality : undefined,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,

      builtUpAreaSqFt: toNumberOrUndefined(body.builtUpAreaSqFt),
      floorCount: toNumberOrUndefined(body.floorCount),
      grade:
        body.grade === "economy" ||
        body.grade === "standard" ||
        body.grade === "premium"
          ? body.grade
          : undefined,
      roomCount: toNumberOrUndefined(body.roomCount),
      bathroomCount: toNumberOrUndefined(body.bathroomCount),
      kitchenCount: toNumberOrUndefined(body.kitchenCount),

      hasInteriorWork:
        typeof body.hasInteriorWork === "boolean"
          ? body.hasInteriorWork
          : undefined,

      projectStartDate:
        typeof body.projectStartDate === "string"
          ? body.projectStartDate
          : undefined,

      status:
        body.status === "planning" ||
        body.status === "rfq_started" ||
        body.status === "procurement" ||
        body.status === "execution" ||
        body.status === "completed" ||
        body.status === "cancelled"
          ? body.status
          : undefined,
    };

    const updatePayload = normalizeConstructionProjectUpdate(payload);

    const { data, error } = await supabase
      .from("construction_projects")
      .update(updatePayload)
      .eq("id", params.id)
      .eq("user_id", user.id)
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
      project: data,
    });
  } catch (error) {
    console.error("Construction project PATCH error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update construction project." },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const cookieStore = cookies();
    const supabase = getSupabaseServerClient(cookieStore);

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

    const { error } = await supabase
      .from("construction_projects")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Construction project DELETE error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to delete construction project." },
      { status: 500 },
    );
  }
}
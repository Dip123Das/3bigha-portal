import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  normalizeConstructionProjectInsert,
  type CreateConstructionProjectPayload,
} from "@/lib/construction-cost/project-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidTitle(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 3;
}

function toNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));

  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
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
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      projects: data ?? [],
    });
  } catch (error) {
    console.error("Construction projects GET error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to load construction projects." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    if (!isValidTitle(body.title)) {
      return NextResponse.json(
        { ok: false, error: "Project title must be at least 3 characters." },
        { status: 400 },
      );
    }

    const payload: CreateConstructionProjectPayload = {
      title: body.title,
      city: typeof body.city === "string" ? body.city : undefined,
      locality: typeof body.locality === "string" ? body.locality : undefined,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,

      builtUpAreaSqFt: toNumber(body.builtUpAreaSqFt, 1000),
      floorCount: toNumber(body.floorCount, 1),
      grade:
        body.grade === "economy" ||
        body.grade === "standard" ||
        body.grade === "premium"
          ? body.grade
          : "standard",
      roomCount: toNumber(body.roomCount, 3),
      bathroomCount: toNumber(body.bathroomCount, 2),
      kitchenCount: toNumber(body.kitchenCount, 1),
      hasInteriorWork: Boolean(body.hasInteriorWork),

      projectStartDate:
        typeof body.projectStartDate === "string"
          ? body.projectStartDate
          : undefined,
      status: "planning",
    };

    const insertPayload = normalizeConstructionProjectInsert(payload, user.id);

    const { data, error } = await supabase
      .from("construction_projects")
      .insert(insertPayload)
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
    console.error("Construction projects POST error:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to create construction project." },
      { status: 500 },
    );
  }
}
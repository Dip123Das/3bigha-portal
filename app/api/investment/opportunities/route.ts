import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return !!v && UUID_RE.test(v);
}

function normalizeString(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeNumber(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(supabase: any, base: string): Promise<string> {
  let slug = base || "investment-opportunity";
  let count = 1;

  while (true) {
    const { data } = await supabase
      .from("investment_opportunities")
      .select("id")
      .eq("slug", slug)
      .limit(1);

    if (!data || data.length === 0) break;

    count++;
    slug = `${base}-${count}`;
  }

  return slug;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const sourceType = normalizeString(body?.sourceType);
    const sourceId = isUuid(body?.sourceId) ? String(body.sourceId) : null;
    const title = normalizeString(body?.title);

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (!sourceType) {
      return NextResponse.json(
        { ok: false, error: "sourceType is required" },
        { status: 400 }
      );
    }

    const opportunityType =
      normalizeString(body?.opportunityType) || "inventory_investment";

    const description = normalizeString(body?.description);
    const city = normalizeString(body?.city);
    const state = normalizeString(body?.state);
    const country = normalizeString(body?.country);

    const visibility =
      body?.visibility === "private" ? "private" : "public";

    const status =
      body?.status === "draft" ||
      body?.status === "inactive" ||
      body?.status === "active"
        ? body.status
        : "active";

    const minInvestment = normalizeNumber(body?.minInvestment);
    const maxInvestment = normalizeNumber(body?.maxInvestment);

    if (
      minInvestment !== null &&
      maxInvestment !== null &&
      maxInvestment < minInvestment
    ) {
      return NextResponse.json(
        { ok: false, error: "Max investment must be >= min investment" },
        { status: 400 }
      );
    }

    const expectedHoldingMonths = normalizeNumber(body?.expectedHoldingMonths);

    const riskLevel =
      body?.riskLevel === "low" ||
      body?.riskLevel === "high"
        ? body.riskLevel
        : "medium";

    const coverImageUrl = normalizeString(body?.coverImageUrl);

    const businessProfileId = isUuid(body?.businessProfileId)
      ? String(body.businessProfileId)
      : null;

    if (sourceType === "property" && sourceId) {
      const existing = await supabase
        .from("investment_opportunities")
        .select("id, slug")
        .eq("source_type", "property")
        .eq("source_id", sourceId)
        .limit(1)
        .maybeSingle();

      if (existing.error) {
        return NextResponse.json(
          { ok: false, error: existing.error.message },
          { status: 500 }
        );
      }

      if (existing.data?.id) {
        const { data, error } = await supabase
          .from("investment_opportunities")
          .update({
            created_by_user_id: user.id,
            business_profile_id: businessProfileId,
            opportunity_type: opportunityType,
            title,
            description,
            city,
            state,
            country,
            visibility,
            status,
            min_investment: minInvestment,
            max_investment: maxInvestment,
            expected_holding_months: expectedHoldingMonths,
            risk_level: riskLevel,
            cover_image_url: coverImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.data.id)
          .select()
          .single();

        if (error) {
          return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
          );
        }

        return NextResponse.json({
          ok: true,
          mode: "updated",
          opportunity: data,
        });
      }
    }

    const baseSlug = slugify(title);
    const slug = await generateUniqueSlug(supabase, baseSlug);

    const { data, error } = await supabase
      .from("investment_opportunities")
      .insert({
        created_by_user_id: user.id,
        business_profile_id: businessProfileId,
        opportunity_type: opportunityType,
        source_type: sourceType,
        source_id: sourceId,
        title,
        slug,
        description,
        city,
        state,
        country,
        visibility,
        status,
        min_investment: minInvestment,
        max_investment: maxInvestment,
        expected_holding_months: expectedHoldingMonths,
        risk_level: riskLevel,
        cover_image_url: coverImageUrl,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "created",
      opportunity: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 12)));

    const type = searchParams.get("type");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    const riskLevel = searchParams.get("riskLevel");
    const sourceType = searchParams.get("source_type");
    const sourceId = searchParams.get("source_id");
    const sort = searchParams.get("sort") || "latest";

    if (sourceId && !isUuid(sourceId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid source_id" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    let query = supabase
      .from("investment_opportunities")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .eq("visibility", "public");

    if (type) query = query.eq("opportunity_type", type);
    if (riskLevel) query = query.eq("risk_level", riskLevel);
    if (sourceType) query = query.eq("source_type", sourceType);
    if (sourceId && isUuid(sourceId)) query = query.eq("source_id", sourceId);
    if (city) query = query.ilike("city", `%${city}%`);
    if (state) query = query.ilike("state", `%${state}%`);

    if (sort === "minInvestmentAsc") {
      query = query.order("min_investment", { ascending: true });
    } else if (sort === "minInvestmentDesc") {
      query = query.order("min_investment", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
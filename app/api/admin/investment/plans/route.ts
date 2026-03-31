import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type PlanCategory = "cash_investment" | "joint_venture_land" | "hybrid";
type PlanStatus = "draft" | "active" | "inactive";
type RiskLevel = "low" | "moderate" | "high";

type PlanPayload = {
  title?: string;
  slug?: string;
  category?: PlanCategory;
  plan_type?: string;
  short_description?: string | null;
  highlight_text?: string | null;
  public_label?: string | null;
  roi_summary?: string | null;
  risk_level?: RiskLevel;
  status?: PlanStatus;
  lock_in_summary?: string | null;
  exit_summary?: string | null;
  default_terms?: string | null;
  default_disclaimer?: string | null;
  policy_note?: string | null;
  builder_customisation_note?: string | null;
  min_ticket_size?: string | null;
  target_return_summary?: string | null;
  revenue_share_note?: string | null;
  profit_share_note?: string | null;
  land_contribution_note?: string | null;
  area_share_note?: string | null;
  builder_obligation_note?: string | null;
  landowner_obligation_note?: string | null;
  hybrid_structure_note?: string | null;
  sort_order?: number | null;
  is_featured?: boolean | null;
};

function makeSlug(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function cleanText(value: unknown) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
}

function normalizePlanPayload(body: any): PlanPayload {
  return {
    title: cleanText(body?.title) || undefined,
    slug: cleanText(body?.slug) || undefined,
    category: body?.category,
    plan_type: cleanText(body?.plan_type || body?.planType) || undefined,
    short_description: cleanText(body?.short_description ?? body?.shortDescription),
    highlight_text: cleanText(body?.highlight_text ?? body?.highlightText),
    public_label: cleanText(body?.public_label ?? body?.publicLabel),
    roi_summary: cleanText(body?.roi_summary ?? body?.roiSummary),
    risk_level: body?.risk_level ?? body?.riskLevel ?? "moderate",
    status: body?.status ?? "draft",
    lock_in_summary: cleanText(body?.lock_in_summary ?? body?.lockInSummary),
    exit_summary: cleanText(body?.exit_summary ?? body?.exitSummary),
    default_terms: cleanText(body?.default_terms ?? body?.defaultTerms),
    default_disclaimer: cleanText(
      body?.default_disclaimer ?? body?.defaultDisclaimer
    ),
    policy_note: cleanText(body?.policy_note ?? body?.policyNote),
    builder_customisation_note: cleanText(
      body?.builder_customisation_note ?? body?.builderCustomisationNote
    ),
    min_ticket_size: cleanText(body?.min_ticket_size ?? body?.minTicketSize),
    target_return_summary: cleanText(
      body?.target_return_summary ?? body?.targetReturnSummary
    ),
    revenue_share_note: cleanText(
      body?.revenue_share_note ?? body?.revenueShareNote
    ),
    profit_share_note: cleanText(body?.profit_share_note ?? body?.profitShareNote),
    land_contribution_note: cleanText(
      body?.land_contribution_note ?? body?.landContributionNote
    ),
    area_share_note: cleanText(body?.area_share_note ?? body?.areaShareNote),
    builder_obligation_note: cleanText(
      body?.builder_obligation_note ?? body?.builderObligationNote
    ),
    landowner_obligation_note: cleanText(
      body?.landowner_obligation_note ?? body?.landownerObligationNote
    ),
    hybrid_structure_note: cleanText(
      body?.hybrid_structure_note ?? body?.hybridStructureNote
    ),
    sort_order:
      body?.sort_order === undefined || body?.sort_order === null || body?.sort_order === ""
        ? 0
        : Number(body.sort_order),
    is_featured: Boolean(body?.is_featured ?? body?.isFeatured ?? false),
  };
}

async function requireInvestmentAdmin() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Unauthorized.",
      supabase,
      user: null,
    };
  }

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(prof?.role || "");

  if (profErr) {
    return {
      ok: false as const,
      status: 500,
      error: profErr.message || "Unable to verify admin role.",
      supabase,
      user,
    };
  }

  if (role !== "master_admin" && role !== "investment_admin") {
    return {
      ok: false as const,
      status: 403,
      error: "Access denied.",
      supabase,
      user,
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

export async function GET(req: Request) {
  const auth = await requireInvestmentAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").trim();

  let query = supabase
    .from("investment_plan_master")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (
    category &&
    ["cash_investment", "joint_venture_land", "hybrid"].includes(category)
  ) {
    query = query.eq("category", category);
  }

  if (status && ["draft", "active", "inactive"].includes(status)) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(
      [
        `title.ilike.%${q}%`,
        `slug.ilike.%${q}%`,
        `plan_type.ilike.%${q}%`,
        `short_description.ilike.%${q}%`,
        `highlight_text.ilike.%${q}%`,
        `public_label.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load plans." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: data || [],
  });
}

export async function POST(req: Request) {
  const auth = await requireInvestmentAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user } = auth;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const payload = normalizePlanPayload(body);

  if (!payload.title) {
    return NextResponse.json(
      { ok: false, error: "Title is required." },
      { status: 400 }
    );
  }

  if (!payload.category) {
    return NextResponse.json(
      { ok: false, error: "Category is required." },
      { status: 400 }
    );
  }

  if (!["cash_investment", "joint_venture_land", "hybrid"].includes(payload.category)) {
    return NextResponse.json(
      { ok: false, error: "Invalid category." },
      { status: 400 }
    );
  }

  if (!payload.plan_type) {
    return NextResponse.json(
      { ok: false, error: "Plan type is required." },
      { status: 400 }
    );
  }

  if (!["draft", "active", "inactive"].includes(String(payload.status))) {
    return NextResponse.json(
      { ok: false, error: "Invalid status." },
      { status: 400 }
    );
  }

  if (!["low", "moderate", "high"].includes(String(payload.risk_level))) {
    return NextResponse.json(
      { ok: false, error: "Invalid risk level." },
      { status: 400 }
    );
  }

  const slug = makeSlug(payload.slug || payload.title);

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Valid slug could not be generated." },
      { status: 400 }
    );
  }

  const insertPayload = {
    ...payload,
    slug,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await supabase
    .from("investment_plan_master")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to create plan." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Plan created successfully.",
      data,
    },
    { status: 201 }
  );
}
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
    plan_type: cleanText(body?.plan_type ?? body?.planType) || undefined,
    short_description: cleanText(body?.short_description ?? body?.shortDescription),
    highlight_text: cleanText(body?.highlight_text ?? body?.highlightText),
    public_label: cleanText(body?.public_label ?? body?.publicLabel),
    roi_summary: cleanText(body?.roi_summary ?? body?.roiSummary),
    risk_level: body?.risk_level ?? body?.riskLevel,
    status: body?.status,
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
      body?.sort_order === undefined ||
      body?.sort_order === null ||
      body?.sort_order === ""
        ? undefined
        : Number(body.sort_order),
    is_featured:
      body?.is_featured === undefined && body?.isFeatured === undefined
        ? undefined
        : Boolean(body?.is_featured ?? body?.isFeatured),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

async function resolveId(params: Promise<{ id: string }> | { id: string }) {
  const resolved = await Promise.resolve(params);
  return decodeURIComponent(String(resolved?.id || "")).trim();
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireInvestmentAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase } = auth;
  const id = await resolveId(context.params);

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Plan id is required." },
      { status: 400 }
    );
  }

  const query = isUuid(id)
    ? supabase.from("investment_plan_master").select("*").eq("id", id).maybeSingle()
    : supabase.from("investment_plan_master").select("*").eq("slug", id).maybeSingle();

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to load plan." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Plan not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data,
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = await requireInvestmentAdmin();

  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user } = auth;
  const id = await resolveId(context.params);

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Plan id is required." },
      { status: 400 }
    );
  }

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

  if (
    payload.category &&
    !["cash_investment", "joint_venture_land", "hybrid"].includes(payload.category)
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid category." },
      { status: 400 }
    );
  }

  if (
    payload.status &&
    !["draft", "active", "inactive"].includes(String(payload.status))
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid status." },
      { status: 400 }
    );
  }

  if (
    payload.risk_level &&
    !["low", "moderate", "high"].includes(String(payload.risk_level))
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid risk level." },
      { status: 400 }
    );
  }

  if (payload.slug || payload.title) {
    const sourceSlug = payload.slug || payload.title || "";
    payload.slug = makeSlug(sourceSlug);

    if (!payload.slug) {
      return NextResponse.json(
        { ok: false, error: "Valid slug could not be generated." },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, any> = {
    ...payload,
    updated_by: user.id,
  };

  Object.keys(updatePayload).forEach((key) => {
    if (updatePayload[key] === undefined) {
      delete updatePayload[key];
    }
  });

  const query = isUuid(id)
    ? supabase
        .from("investment_plan_master")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .maybeSingle()
    : supabase
        .from("investment_plan_master")
        .update(updatePayload)
        .eq("slug", id)
        .select("*")
        .maybeSingle();

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update plan." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Plan not found or not updated." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Plan updated successfully.",
    data,
  });
}
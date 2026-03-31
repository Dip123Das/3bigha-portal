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

function normalizeInteger(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function generateUniqueSlug(
  supabase: any,
  base: string,
  excludeId?: string | null
): Promise<string> {
  const baseSlug = base || "investment-opportunity";
  let slug = baseSlug;
  let count = 1;

  while (true) {
    let q = supabase.from("investment_opportunities").select("id").eq("slug", slug).limit(1);

    if (excludeId) {
      q = q.neq("id", excludeId);
    }

    const { data, error } = await q;

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) break;

    count += 1;
    slug = `${baseSlug}-${count}`;
  }

  return slug;
}

function mapOpportunity(row: any, terms: any, linkedAsset: any, viewerUserId?: string | null) {
  const isOwner = !!viewerUserId && row.created_by_user_id === viewerUserId;
  const canEdit = isOwner && ["draft", "pending_review"].includes(row.status);
  const canApply =
    !!viewerUserId &&
    !isOwner &&
    row.status === "active" &&
    row.visibility === "public";

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    opportunityType: row.opportunity_type,
    sourceType: row.source_type,
    sourceId: row.source_id,
    city: row.city,
    state: row.state,
    country: row.country,
    visibility: row.visibility,
    status: row.status,
    minInvestment: row.min_investment,
    maxInvestment: row.max_investment,
    expectedHoldingMonths: row.expected_holding_months,
    riskLevel: row.risk_level,
    coverImageUrl: row.cover_image_url,
    businessProfileId: row.business_profile_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    terms: terms
      ? {
          id: terms.id,
          modelType: terms.model_type,
          entryPrice: terms.entry_price,
          marketPrice: terms.market_price,
          investorSharePercent: terms.investor_share_percent,
          builderSharePercent: terms.builder_share_percent,
          lockInMonths: terms.lock_in_months,
          exitRule: terms.exit_rule,
          profitRule: terms.profit_rule,
          createdAt: terms.created_at,
        }
      : null,
    linkedAsset,
    viewerContext: {
      isOwner,
      canEdit,
      canApply,
    },
  };
}

async function getOptionalViewerId(supabase: any): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

/* -------------------- GET SINGLE OPPORTUNITY -------------------- */

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params?.id || "");

    if (!isUuid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid opportunity id." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);
    const viewerUserId = await getOptionalViewerId(supabase);

    const { data: row, error } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    const isOwner = !!viewerUserId && row.created_by_user_id === viewerUserId;
    const isPubliclyVisible =
      row.status === "active" && row.visibility === "public";

    if (!isOwner && !isPubliclyVisible) {
      return NextResponse.json(
        { ok: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    const { data: terms } = await supabase
      .from("investment_terms")
      .select("*")
      .eq("opportunity_id", id)
      .eq("is_current", true)
      .maybeSingle();

    let linkedAsset: any = null;

    try {
      if (row.source_type === "property" && row.source_id) {
        const { data: propertyRow } = await supabase
          .from("property_listings")
          .select("id, title, slug, price, city, state, cover_image_url")
          .eq("id", row.source_id)
          .maybeSingle();

        if (propertyRow) {
          linkedAsset = {
            id: propertyRow.id,
            type: "property",
            title: propertyRow.title ?? null,
            slug: propertyRow.slug ?? null,
            price: propertyRow.price ?? null,
            city: propertyRow.city ?? null,
            state: propertyRow.state ?? null,
            coverImageUrl: propertyRow.cover_image_url ?? null,
          };
        }
      } else if (row.source_type === "builder_project" && row.source_id) {
        const { data: projectRow } = await supabase
          .from("builder_projects")
          .select("id, name, city, state, cover_image_url")
          .eq("id", row.source_id)
          .maybeSingle();

        if (projectRow) {
          linkedAsset = {
            id: projectRow.id,
            type: "builder_project",
            title: projectRow.name ?? null,
            slug: null,
            price: null,
            city: projectRow.city ?? null,
            state: projectRow.state ?? null,
            coverImageUrl: projectRow.cover_image_url ?? null,
          };
        }
      }
    } catch {
      linkedAsset = null;
    }

    return NextResponse.json({
      ok: true,
      opportunity: mapOpportunity(row, terms, linkedAsset, viewerUserId),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* -------------------- PATCH OPPORTUNITY -------------------- */

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params?.id || "");

    if (!isUuid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid opportunity id." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from("investment_opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: existingError.message },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Opportunity not found." },
        { status: 404 }
      );
    }

    if (existing.created_by_user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this opportunity." },
        { status: 403 }
      );
    }

    if (!["draft", "pending_review"].includes(existing.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: "This opportunity can no longer be edited in its current status.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates: Record<string, any> = {};

    if ("opportunityType" in body) {
      const val = body.opportunityType;
      if (
        val !== "inventory_investment" &&
        val !== "landowner_partnership"
      ) {
        return NextResponse.json(
          { ok: false, error: "Invalid opportunityType." },
          { status: 400 }
        );
      }
      updates.opportunity_type = val;
    }

    if ("sourceType" in body) {
      const val = body.sourceType;
      if (val !== "property" && val !== "builder_project" && val !== "land") {
        return NextResponse.json(
          { ok: false, error: "Invalid sourceType." },
          { status: 400 }
        );
      }
      updates.source_type = val;
    }

    if ("sourceId" in body) {
      const sourceId = normalizeString(body.sourceId);
      if (sourceId && !isUuid(sourceId)) {
        return NextResponse.json(
          { ok: false, error: "Invalid sourceId." },
          { status: 400 }
        );
      }
      updates.source_id = sourceId;
    }

    if ("title" in body) {
      const title = normalizeString(body.title);
      if (!title) {
        return NextResponse.json(
          { ok: false, error: "Title cannot be empty." },
          { status: 400 }
        );
      }
      updates.title = title;

      if (title !== existing.title) {
        const newSlug = await generateUniqueSlug(
          supabase,
          slugify(title),
          id
        );
        updates.slug = newSlug;
      }
    }

    if ("description" in body) {
      updates.description = normalizeString(body.description);
    }

    if ("city" in body) {
      updates.city = normalizeString(body.city);
    }

    if ("state" in body) {
      updates.state = normalizeString(body.state);
    }

    if ("country" in body) {
      updates.country = normalizeString(body.country);
    }

    if ("visibility" in body) {
      const val = body.visibility;
      if (val !== "public" && val !== "private") {
        return NextResponse.json(
          { ok: false, error: "Invalid visibility." },
          { status: 400 }
        );
      }
      updates.visibility = val;
    }

    let finalMin = existing.min_investment;
    let finalMax = existing.max_investment;

    if ("minInvestment" in body) {
      const val =
        body.minInvestment === null ? null : normalizeNumber(body.minInvestment);
      if (body.minInvestment !== null && val === null) {
        return NextResponse.json(
          { ok: false, error: "Invalid minInvestment." },
          { status: 400 }
        );
      }
      if (val !== null && val < 0) {
        return NextResponse.json(
          { ok: false, error: "minInvestment must be >= 0." },
          { status: 400 }
        );
      }
      updates.min_investment = val;
      finalMin = val;
    }

    if ("maxInvestment" in body) {
      const val =
        body.maxInvestment === null ? null : normalizeNumber(body.maxInvestment);
      if (body.maxInvestment !== null && val === null) {
        return NextResponse.json(
          { ok: false, error: "Invalid maxInvestment." },
          { status: 400 }
        );
      }
      if (val !== null && val < 0) {
        return NextResponse.json(
          { ok: false, error: "maxInvestment must be >= 0." },
          { status: 400 }
        );
      }
      updates.max_investment = val;
      finalMax = val;
    }

    if (
      finalMin !== null &&
      finalMax !== null &&
      Number(finalMax) < Number(finalMin)
    ) {
      return NextResponse.json(
        { ok: false, error: "Max investment must be >= min investment." },
        { status: 400 }
      );
    }

    if ("expectedHoldingMonths" in body) {
      const val =
        body.expectedHoldingMonths === null
          ? null
          : normalizeInteger(body.expectedHoldingMonths);

      if (body.expectedHoldingMonths !== null && val === null) {
        return NextResponse.json(
          { ok: false, error: "Invalid expectedHoldingMonths." },
          { status: 400 }
        );
      }

      if (val !== null && val < 0) {
        return NextResponse.json(
          { ok: false, error: "expectedHoldingMonths must be >= 0." },
          { status: 400 }
        );
      }

      updates.expected_holding_months = val;
    }

    if ("riskLevel" in body) {
      const val = body.riskLevel;
      if (val !== "low" && val !== "medium" && val !== "high") {
        return NextResponse.json(
          { ok: false, error: "Invalid riskLevel." },
          { status: 400 }
        );
      }
      updates.risk_level = val;
    }

    if ("coverImageUrl" in body) {
      updates.cover_image_url = normalizeString(body.coverImageUrl);
    }

    if ("businessProfileId" in body) {
      const val = normalizeString(body.businessProfileId);
      if (val && !isUuid(val)) {
        return NextResponse.json(
          { ok: false, error: "Invalid businessProfileId." },
          { status: 400 }
        );
      }
      updates.business_profile_id = val;
    }

    if (Object.keys(updates).length === 0) {
      const { data: currentTerms } = await supabase
        .from("investment_terms")
        .select("*")
        .eq("opportunity_id", existing.id)
        .eq("is_current", true)
        .maybeSingle();

      return NextResponse.json({
        ok: true,
        opportunity: mapOpportunity(existing, currentTerms, null, user.id),
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("investment_opportunities")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    const { data: currentTerms } = await supabase
      .from("investment_terms")
      .select("*")
      .eq("opportunity_id", updated.id)
      .eq("is_current", true)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      opportunity: mapOpportunity(updated, currentTerms, null, user.id),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
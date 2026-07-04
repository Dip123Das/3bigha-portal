import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const state = searchParams.get("state") || "West Bengal";
    const productType = searchParams.get("productType") || "home";

    const cookieStore = cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    let query = supabase
      .from("finance_lender_offers")
      .select(`
        id,
        lender_name,
        lender_type,
        state,
        district,
        product_type,
        min_roi,
        max_roi,
        processing_fee_percent,
        min_cibil,
        max_foir_percent,
        max_tenure_years,
        ltv_percent,
        terms_note,
        updated_at
      `)
      .eq("is_active", true)
      .eq("is_verified", true)
      .eq("product_type", productType)
      .order("min_roi", {
        ascending: true,
      });

    if (state) {
      query = query.eq("state", state);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          offers: [],
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      offers: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        offers: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = getAdminClient();

    const lenderName = String(body.lenderName || "").trim();

    if (!lenderName) {
      return NextResponse.json(
        { ok: false, error: "Lender name is required." },
        { status: 400 }
      );
    }

    const payload = {
      lender_name: lenderName,
      lender_type: String(body.lenderType || "bank"),
      state: String(body.state || "West Bengal").trim(),
      district: String(body.district || "").trim() || null,
      geo_state_id: String(body.geo_state_id || "").trim() || null,
      geo_district_id: String(body.geo_district_id || "").trim() || null,
      geo_subdivision_id: String(body.geo_subdivision_id || "").trim() || null,
      geo_block_id: String(body.geo_block_id || "").trim() || null,
      geo_place_id: String(body.geo_place_id || "").trim() || null,
      product_type: String(body.productType || "home").trim(),

      min_roi: Number(body.minRoi || 0),
      max_roi: Number(body.maxRoi || 0),
      processing_fee_percent: Number(
        body.processingFeePercent || 0
      ),
      min_cibil: Number(body.minCibil || 0),
      max_foir_percent: Number(body.maxFoirPercent || 0),
      max_tenure_years: Number(body.maxTenureYears || 0),
      ltv_percent: Number(body.ltvPercent || 0),
      terms_note: String(body.termsNote || "").trim() || null,

      is_active: false,
      is_verified: false,
    };

    const { data, error } = await supabase
      .from("finance_lender_offers")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      offerId: data?.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
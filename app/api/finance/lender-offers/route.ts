import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const state =
      searchParams.get("state") || "West Bengal";

    const productType =
      searchParams.get("productType") || "home";

    const cookieStore = cookies();

    const supabase =
      getSupabaseServerClient(cookieStore);

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
        {
          status: 500,
        }
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
      {
        status: 500,
      }
    );
  }
}
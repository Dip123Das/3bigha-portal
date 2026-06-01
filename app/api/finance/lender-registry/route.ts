import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const { data, error } = await supabase
      .from("finance_lender_registry")
      .select(`
        id,
        lender_name,
        lender_type,
        head_office_state,
        is_active,
        is_verified,
        updated_at
      `)
      .eq("is_active", true)
      .eq("is_verified", true)
      .order("lender_name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, lenders: [], error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      lenders: data || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        lenders: [],
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

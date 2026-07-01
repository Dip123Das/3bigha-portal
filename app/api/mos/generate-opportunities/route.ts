import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAutonomousMarketplaceOpportunities } from "@/lib/marketplace/mos";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase service environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    const result = await generateAutonomousMarketplaceOpportunities({
      supabase,
      limit: Number(body?.limit || 10),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Opportunity generation failed" },
      { status: 500 }
    );
  }
}

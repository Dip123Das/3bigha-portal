import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  createMarketplaceOpportunityEvent,
  getDemandAroundMe,
} from "@/lib/marketplace/mos";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Marketplace Opportunity Events API",
    method: "POST",
    authentication: "Required",
    status: "Available",
  });
}

export async function POST() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const demandAroundMe = await getDemandAroundMe({
      supabase,
      userId: user.id,
    });

    const result = await createMarketplaceOpportunityEvent({
      supabase,
      userId: user.id,
      demandAroundMe,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create marketplace opportunity event" },
      { status: 500 }
    );
  }
}

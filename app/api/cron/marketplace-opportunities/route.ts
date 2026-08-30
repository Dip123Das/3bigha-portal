import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAutonomousMarketplaceOpportunities } from "@/lib/marketplace/mos";
import { authorizeInternalJobRequest } from "@/lib/security/internal-job-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  const denied = authorizeInternalJobRequest(request);
  if (denied) return denied;
  try {
    const supabase = getSupabaseAdmin();

    const started = Date.now();

    const result =
      await generateAutonomousMarketplaceOpportunities({
        supabase,
        limit: 25,
      });

    return NextResponse.json({
      ...result,
      runtime_ms: Date.now() - started,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || "Marketplace opportunity cron failed",
      },
      {
        status: 500,
      }
    );
  }
}

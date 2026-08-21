import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  loadCanonicalTrustBulk,
  type CanonicalTrustSubject,
} from "@/lib/trust";

export const dynamic = "force-dynamic";

const MAX_USER_IDS = 100;

function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizeUserIds(input: unknown) {
  if (!Array.isArray(input)) return [];

  return Array.from(
    new Set(
      input
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_USER_IDS);
}

function normalizeSubject(
  value: unknown
): CanonicalTrustSubject | undefined {
  const subject = String(value ?? "").trim();

  if (
    subject === "member" ||
    subject === "business" ||
    subject === "individual_professional" ||
    subject === "banker"
  ) {
    return subject;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const userIds = normalizeUserIds(body?.userIds);
    const subject = normalizeSubject(body?.subject);

    if (userIds.length === 0) {
      return NextResponse.json({ trustByUserId: {} });
    }

    const supabase = createServerSupabase();
    const models = await loadCanonicalTrustBulk(
      supabase,
      userIds,
      { subject }
    );

    return NextResponse.json(
      {
        trustByUserId: Object.fromEntries(models),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("BULK_CANONICAL_TRUST_ERROR", error);

    return NextResponse.json(
      {
        error: "Unable to load marketplace trust.",
        trustByUserId: {},
      },
      { status: 500 }
    );
  }
}

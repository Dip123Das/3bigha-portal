import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_HISTORY_LIMIT = 10;
const MAX_HISTORY_LIMIT = 25;

type IntelligenceSnapshotRow = {
  id: string;
  user_id: string;
  business_id: string;
  version: string;
  source: string;
  trust_score: number;
  trust_confidence: number;
  requires_human_review: boolean;
  created_at: string;
};

type SafeIntelligenceSummary = {
  snapshotId: string;
  version: string;
  source: string;
  trustScore: number;
  trustConfidence: number;
  requiresHumanReview: boolean;
  createdAt: string;
};

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
    },
    { status }
  );
}

function resolveHistoryLimit(request: Request) {
  const url = new URL(request.url);
  const requestedLimit = Number(
    url.searchParams.get("limit") ||
      DEFAULT_HISTORY_LIMIT
  );

  if (!Number.isInteger(requestedLimit)) {
    return DEFAULT_HISTORY_LIMIT;
  }

  return Math.min(
    Math.max(requestedLimit, 1),
    MAX_HISTORY_LIMIT
  );
}

function toSafeSummary(
  row: IntelligenceSnapshotRow
): SafeIntelligenceSummary {
  return {
    snapshotId: row.id,
    version: row.version,
    source: row.source,
    trustScore: Number(row.trust_score || 0),
    trustConfidence: Number(
      row.trust_confidence || 0
    ),
    requiresHumanReview:
      row.requires_human_review === true,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "Login required.",
        401,
        "AUTHENTICATION_REQUIRED"
      );
    }

    const limit = resolveHistoryLimit(request);

    /*
     * INT-1C
     *
     * The authenticated session client is used so that
     * registration_intelligence_snapshots RLS remains
     * authoritative.
     *
     * The explicit user_id and business_id filters provide
     * defence in depth and document the ownership contract.
     *
     * The complete snapshot JSON is deliberately excluded.
     */
    const { data, error } = await supabase
      .from("registration_intelligence_snapshots")
      .select(
        [
          "id",
          "user_id",
          "business_id",
          "version",
          "source",
          "trust_score",
          "trust_confidence",
          "requires_human_review",
          "created_at",
        ].join(",")
      )
      .eq("user_id", user.id)
      .eq("business_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (error) {
      console.error(
        "REGISTRATION_INTELLIGENCE_RETRIEVAL_FAILED",
        {
          userId: user.id,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        }
      );

      return errorResponse(
        "Registration intelligence could not be loaded safely.",
        500,
        "REGISTRATION_INTELLIGENCE_RETRIEVAL_FAILED"
      );
    }

    const rows = Array.isArray(data)
      ? data as unknown as IntelligenceSnapshotRow[]
      : [];

    const history = rows.map(toSafeSummary);

    return NextResponse.json({
      ok: true,
      code:
        "REGISTRATION_INTELLIGENCE_RETRIEVED",

      latest: history[0] || null,

      history,

      pagination: {
        returned: history.length,
        requestedLimit: limit,
        maximumLimit: MAX_HISTORY_LIMIT,
        hasMore:
          history.length === limit,
      },

      privacy: {
        fullSnapshotIncluded: false,
        evidenceIncluded: false,
        internalAssessmentsIncluded: false,
      },
    });
  } catch (error) {
    console.error(
      "REGISTRATION_INTELLIGENCE_RETRIEVAL_UNEXPECTED_ERROR",
      error
    );

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unexpected registration intelligence retrieval error.",
      500,
      "UNEXPECTED_ERROR"
    );
  }
}

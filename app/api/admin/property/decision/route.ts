import {
  NextRequest,
  NextResponse,
} from "next/server";
import { cookies } from "next/headers";

import {
  getSupabaseAdmin,
} from "@/lib/supabaseAdmin";
import {
  getSupabaseServerClient,
} from "@/lib/supabaseServer";
import {
  evaluateTrustedPublication,
} from "@/lib/media/trusted-publication-server";

type PropertyDecision =
  | "approved"
  | "rejected"
  | "pending";

function jsonError(
  message: string,
  status: number,
  code = "REQUEST_FAILED",
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function normalizeDecision(
  value: unknown,
): PropertyDecision | null {
  const decision = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    decision === "approved" ||
    decision === "rejected" ||
    decision === "pending"
  ) {
    return decision;
  }

  return null;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return jsonError(
        "Authentication required.",
        401,
        "UNAUTHORIZED",
      );
    }

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      return jsonError(
        "Unable to verify admin authority.",
        500,
        "ADMIN_AUTHORITY_CHECK_FAILED",
      );
    }

    const role = String(
      profileResult.data?.role || "",
    )
      .trim()
      .toLowerCase();

    const allowedRoles = new Set([
      "master_admin",
      "property_admin",
      "admin",
    ]);

    if (!allowedRoles.has(role)) {
      return jsonError(
        "Property admin authority required.",
        403,
        "FORBIDDEN",
      );
    }

    const body = await request
      .json()
      .catch(() => null);

    const listingId = String(
      body?.listingId || "",
    ).trim();

    const decision =
      normalizeDecision(body?.decision);

    if (!listingId) {
      return jsonError(
        "listingId is required.",
        400,
        "LISTING_ID_REQUIRED",
      );
    }

    if (!decision) {
      return jsonError(
        "decision must be approved, rejected, or pending.",
        400,
        "INVALID_DECISION",
      );
    }

    const admin = getSupabaseAdmin();

    const listingResult = await admin
      .from("property_listings")
      .select(
        "id,status,media_json",
      )
      .eq("id", listingId)
      .maybeSingle();

    if (listingResult.error) {
      return jsonError(
        listingResult.error.message,
        500,
        "LISTING_LOOKUP_FAILED",
      );
    }

    if (!listingResult.data?.id) {
      return jsonError(
        "Property listing not found.",
        404,
        "LISTING_NOT_FOUND",
      );
    }

    let trustedPublication:
      | Awaited<
          ReturnType<
            typeof evaluateTrustedPublication
          >
        >
      | null = null;

    if (decision === "approved") {
      trustedPublication =
        await evaluateTrustedPublication(
          "property",
          listingResult.data.media_json,
        );

      if (!trustedPublication.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code:
                trustedPublication.code ||
                "TRUSTED_PUBLICATION_BLOCKED",
              message:
                trustedPublication.message ||
                "Property cannot be approved because Trusted Publication requirements are incomplete.",
            },
            trustedPublication,
          },
          { status: 409 },
        );
      }
    }

    const timestamp =
      new Date().toISOString();

    const updateResult = await admin
      .from("property_listings")
      .update({
        status: decision,
        updated_at: timestamp,
      })
      .eq("id", listingId)
      .select("id,status,updated_at")
      .single();

    if (updateResult.error) {
      return jsonError(
        updateResult.error.message,
        500,
        "LISTING_UPDATE_FAILED",
      );
    }

    return NextResponse.json({
      ok: true,
      listing: updateResult.data,
      decision,
      trustedPublication,
    });
  } catch (error: any) {
    console.error(
      "[admin/property/decision] fatal",
      error,
    );

    return jsonError(
      error?.message ||
        "Unexpected Property decision failure.",
      500,
      "SERVER_ERROR",
    );
  }
}

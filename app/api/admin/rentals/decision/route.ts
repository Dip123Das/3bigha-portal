import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { evaluateTrustedPublication } from "@/lib/media/trusted-publication-server";

type RentalDecision = "approved" | "rejected" | "pending";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...(details === undefined ? {} : { details }),
    },
    { status },
  );
}

function normalizeDecision(value: unknown): RentalDecision | null {
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

export async function POST(request: NextRequest) {
  try {
    /*
     * 1. Authenticate using the caller's normal Supabase session.
     *    The service-role client must never be used to establish identity.
     */
    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Authentication required.", 401);
    }

    /*
     * 2. Verify canonical Rentals-admin authority.
     */
    const { data: isAdmin, error: adminCheckError } =
      await supabase.rpc("is_current_user_rentals_admin");

    if (adminCheckError) {
      console.error(
        "[admin/rentals/decision] admin authority check failed",
        adminCheckError,
      );

      return jsonError("Unable to verify Rentals admin authority.", 500);
    }

    if (isAdmin !== true) {
      return jsonError("Rentals admin authority required.", 403);
    }

    /*
     * 3. Parse and validate requested transition.
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON request body.", 400);
    }

    const listingId =
      typeof (body as any)?.listingId === "string"
        ? (body as any).listingId.trim()
        : "";

    const decision = normalizeDecision((body as any)?.decision);

    if (!listingId) {
      return jsonError("listingId is required.", 400);
    }

    if (!decision) {
      return jsonError(
        "decision must be approved, rejected, or pending.",
        400,
      );
    }

    /*
     * 4. Read persisted listing evidence.
     *
     * IMPORTANT:
     * photos is the persisted evidence source.
     * Never trust trusted_publication.publication_ready or any readiness
     * boolean submitted/calculated by the browser.
     */
    const admin = getSupabaseAdmin();

    const { data: listing, error: listingError } = await admin
      .from("rental_listings")
      .select("id,status,photos")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError) {
      console.error(
        "[admin/rentals/decision] rental listing read failed",
        listingError,
      );

      return jsonError("Unable to read rental listing.", 500);
    }

    if (!listing) {
      return jsonError("Rental listing not found.", 404);
    }

    /*
     * 5. Approval is a publication boundary.
     *
     * Rejection/pending remain available to admins even when trusted
     * evidence is incomplete or invalid. Approval alone requires the
     * canonical server-side Trusted Publication evaluator.
     */
    let trustedPublication: Awaited<
      ReturnType<typeof evaluateTrustedPublication>
    > | null = null;

    if (decision === "approved") {
      trustedPublication = await evaluateTrustedPublication(
        "rentals",
        listing.photos,
      );

      if (!trustedPublication.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Rental listing cannot be approved because Trusted Publication requirements are not satisfied.",
            code: "TRUSTED_PUBLICATION_BLOCKED",
            trustedPublication,
          },
          { status: 409 },
        );
      }
    }

    /*
     * 6. Perform the privileged mutation only after all server-side
     *    authorization and publication checks have passed.
     */
    const decisionTimestamp =
      new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("rental_listings")
      .update({
        status: decision,
        published_at:
          decision === "approved"
            ? decisionTimestamp
            : null,
        updated_at: decisionTimestamp,
      })
      .eq("id", listingId)
      .select(
        "id,status,published_at,updated_at",
      )
      .single();

    if (updateError) {
      console.error(
        "[admin/rentals/decision] rental listing update failed",
        updateError,
      );

      return jsonError("Unable to update rental listing.", 500);
    }

    return NextResponse.json({
      ok: true,
      listing: updated,
      decision,
      trustedPublication,
    });
  } catch (error) {
    console.error("[admin/rentals/decision] unexpected failure", error);

    return jsonError(
      "Unexpected Rentals decision failure.",
      500,
    );
  }
}

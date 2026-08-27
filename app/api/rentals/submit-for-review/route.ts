import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  evaluateTrustedPublication,
} from "@/lib/media/trusted-publication-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const body = await req
      .json()
      .catch(() => null);

    const listingId = String(
      body?.listingId || "",
    ).trim();

    if (!listingId) {
      return NextResponse.json(
        {
          error: {
            code: "LISTING_ID_REQUIRED",
            message: "listingId is required.",
          },
        },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized.",
          },
        },
        { status: 401 },
      );
    }

    /*
     * SERVER TRUST BOUNDARY
     *
     * Never accept trusted_publication or any
     * readiness boolean from the request body.
     *
     * The persisted photos collection is the
     * authoritative evidence source.
     */
    const existing = await supabase
      .from("rental_listings")
      .select(
        "id,owner_id,status,photos,is_active",
      )
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        {
          error: {
            code: "LISTING_LOOKUP_FAILED",
            message: existing.error.message,
          },
        },
        { status: 500 },
      );
    }

    if (!existing.data?.id) {
      return NextResponse.json(
        {
          error: {
            code: "LISTING_NOT_FOUND",
            message: "Rental listing not found.",
          },
        },
        { status: 404 },
      );
    }

    /*
     * Preserve idempotency for listings already
     * submitted or approved.
     */
    if (existing.data.status === "pending") {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "pending",
        },
      });
    }

    if (existing.data.status === "approved") {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "approved",
        },
      });
    }

    /*
     * photos contains both:
     *
     * - complete UploadedMediaAsset objects
     * - optional legacy/manual photo entries
     *
     * The shared trusted-publication authority
     * decides which entries qualify as genuine
     * trusted live captures.
     */
    const trustedDecision =
      await evaluateTrustedPublication(
        "rentals",
        existing.data.photos,
      );

    console.log(
      "[rentals-submit-for-review] trusted-media",
      {
        listingId,
        userId: user.id,
        requiredCaptures:
          trustedDecision.requiredCaptures,
        completedCaptures:
          trustedDecision.completedCaptures,
        gpsVerified:
          trustedDecision.gpsVerified,
        provenanceVerified:
          trustedDecision.provenanceVerified,
        captureSessionCompleted:
          trustedDecision.captureSessionCompleted,
        aiVerificationStatus:
          trustedDecision.aiVerificationStatus,
        explicitAiFailure:
          trustedDecision.explicitAiFailure,
        ok: trustedDecision.ok,
      },
    );

    if (!trustedDecision.ok) {
      return NextResponse.json(
        {
          error: {
            code:
              trustedDecision.code ||
              "TRUSTED_MEDIA_REQUIRED",

            message:
              trustedDecision.message ||
              "Trusted media verification is incomplete.",

            trustedPublication: {
              module: "rentals",

              requiredCaptures:
                trustedDecision.requiredCaptures,

              completedCaptures:
                trustedDecision.completedCaptures,

              gpsVerified:
                trustedDecision.gpsVerified,

              provenanceVerified:
                trustedDecision.provenanceVerified,

              captureSessionCompleted:
                trustedDecision.captureSessionCompleted,

              aiVerificationStatus:
                trustedDecision.aiVerificationStatus,
            },
          },
        },
        { status: 409 },
      );
    }

    /*
     * Submission means review only.
     *
     * Do not create a new publication model here.
     * rental_listings_public remains the existing
     * public projection controlled by the current
     * approval architecture.
     */
    const updateRes = await supabase
      .from("rental_listings")
      .update({
        status: "pending",
        updated_at:
          new Date().toISOString(),
      } as any)
      .eq("id", listingId)
      .eq("owner_id", user.id)
      .select("id,status")
      .single();

    if (updateRes.error) {
      return NextResponse.json(
        {
          error: {
            code: "SUBMISSION_UPDATE_FAILED",
            message: updateRes.error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,

      data: updateRes.data,

      trustedPublication: {
        module: "rentals",

        requiredCaptures:
          trustedDecision.requiredCaptures,

        completedCaptures:
          trustedDecision.completedCaptures,

        serverVerified: true,
      },
    });
  } catch (e: any) {
    console.error(
      "[rentals-submit-for-review] fatal",
      e,
    );

    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message:
            e?.message ||
            "Unknown server error",
        },
      },
      { status: 500 },
    );
  }
}

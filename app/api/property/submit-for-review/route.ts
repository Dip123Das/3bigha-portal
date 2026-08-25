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

    console.log(
      "[submit-for-review] start",
      { listingId },
    );

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

    console.log(
      "[submit-for-review] auth",
      {
        userId: user?.id || null,
        authError:
          authError?.message || null,
      },
    );

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
     * Never accept trusted-media readiness from
     * the request body. Read the persisted listing
     * and its persisted evidence directly from DB.
     */
    const existing = await supabase
      .from("property_listings")
      .select(
        "id, owner_id, owner_user_id, status, media_json",
      )
      .eq("id", listingId)
      .or(
        `owner_id.eq.${user.id},owner_user_id.eq.${user.id}`,
      )
      .maybeSingle();

    console.log(
      "[submit-for-review] existing",
      {
        error:
          existing.error?.message || null,
        data: existing.data
          ? {
              id: existing.data.id,
              status: existing.data.status,
            }
          : null,
      },
    );

    if (existing.error) {
      return NextResponse.json(
        {
          error: {
            code:
              "LISTING_LOOKUP_FAILED",
            message:
              existing.error.message,
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
            message:
              "Listing not found.",
          },
        },
        { status: 404 },
      );
    }

    /*
     * Existing terminal/review states remain
     * idempotent. We do not retroactively mutate
     * already-pending or approved records here.
     */
    if (
      existing.data.status === "pending"
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "pending",
        },
      });
    }

    if (
      existing.data.status === "approved"
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "approved",
        },
      });
    }

    /*
     * Canonical server-side Trusted Listing Media
     * authority. Evidence comes only from the
     * persisted listing.
     */
    const trustedDecision =
      await evaluateTrustedPublication(
        "property",
        existing.data.media_json,
      );

    console.log(
      "[submit-for-review] trusted-media",
      {
        listingId,
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
              module: "property",
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
     * Defense in depth:
     * bind the status update to the authenticated
     * owner again, even after the earlier lookup.
     */
    const updateRes = await supabase
      .from("property_listings")
      .update({
        status: "pending",
        updated_at:
          new Date().toISOString(),
      } as any)
      .eq("id", listingId)
      .or(
        `owner_id.eq.${user.id},owner_user_id.eq.${user.id}`,
      )
      .select("id,status")
      .single();

    console.log(
      "[submit-for-review] updateRes",
      {
        error:
          updateRes.error?.message || null,
        data:
          updateRes.data || null,
      },
    );

    if (updateRes.error) {
      return NextResponse.json(
        {
          error: {
            code:
              "SUBMISSION_UPDATE_FAILED",
            message:
              updateRes.error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: updateRes.data,
      trustedPublication: {
        module: "property",
        requiredCaptures:
          trustedDecision.requiredCaptures,
        completedCaptures:
          trustedDecision.completedCaptures,
        serverVerified: true,
      },
    });
  } catch (e: any) {
    console.error(
      "[submit-for-review] fatal",
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

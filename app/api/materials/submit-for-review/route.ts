import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import {
  evaluateTrustedPublication,
} from "@/lib/media/trusted-publication-server";

export const dynamic = "force-dynamic";

function readPersistedMaterialMedia(
  attributes: unknown,
): unknown {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return [];
  }

  const record =
    attributes as Record<string, unknown>;

  /*
   * Current Materials persistence shape:
   *
   * attributes.media_links = {
   *   photos: string[],
   *   videos: string[],
   *   media_assets: UploadedMediaAsset[]
   * }
   *
   * The shared server authority can normalize the
   * nested media_assets collection itself.
   */
  return (
    record.media_links ??
    record.media_assets ??
    record.media ??
    []
  );
}

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
     * Never accept trusted-media readiness from
     * the request body. Read persisted listing
     * evidence directly from the database.
     */
    const existing = await supabase
      .from("material_listings")
      .select(
        "id,vendor_user_id,status,attributes,is_public,is_active,published_at",
      )
      .eq("id", listingId)
      .eq("vendor_user_id", user.id)
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
            message: "Listing not found.",
          },
        },
        { status: 404 },
      );
    }

    /*
     * Existing review/public states remain
     * idempotent.
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

    const persistedMedia =
      readPersistedMaterialMedia(
        existing.data.attributes,
      );

    const trustedDecision =
      await evaluateTrustedPublication(
        "materials",
        persistedMedia,
      );

    console.log(
      "[materials-submit-for-review] trusted-media",
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
              module: "materials",

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
     * Submission only enters review.
     *
     * It must never make the listing public.
     */
    const updateRes = await supabase
      .from("material_listings")
      .update({
        status: "pending",
        is_public: false,
        published_at: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", listingId)
      .eq("vendor_user_id", user.id)
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
        module: "materials",

        requiredCaptures:
          trustedDecision.requiredCaptures,

        completedCaptures:
          trustedDecision.completedCaptures,

        serverVerified: true,
      },
    });
  } catch (e: any) {
    console.error(
      "[materials-submit-for-review] fatal",
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

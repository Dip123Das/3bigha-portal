import { NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";

function jsonError(
  message: string,
  status: number,
  code: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(extra ?? {}),
      },
    },
    { status },
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

    const serviceId = String(
      body?.serviceId || "",
    ).trim();

    if (!serviceId) {
      return jsonError(
        "serviceId is required.",
        400,
        "SERVICE_ID_REQUIRED",
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return jsonError(
        "Unauthorized.",
        401,
        "UNAUTHORIZED",
      );
    }

    const providerResult = await supabase
      .from("service_providers")
      .select(
        [
          "id",
          "user_id",
          "display_name",
          "name",
          "country",
          "state",
          "district",
          "city",
        ].join(","),
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (providerResult.error) {
      return jsonError(
        providerResult.error.message,
        500,
        "PROVIDER_LOOKUP_FAILED",
      );
    }

    const provider =
      providerResult.data as
        | Record<string, any>
        | null;

    if (!provider?.id) {
      return jsonError(
        "Service provider profile not found.",
        404,
        "PROVIDER_NOT_FOUND",
      );
    }

    const existing = await supabase
      .from("provider_services")
      .select(
        [
          "id",
          "provider_id",
          "record_status",
          "service_id",
          "custom_category",
          "custom_subcategory",
          "custom_service",
          "service_description",
          "pricing_kind",
          "min_price",
          "max_price",
          "currency",
          "headline",
          "coverage_area",
          "media_assets",
          "geo_state_id",
          "geo_district_id",
          "geo_subdivision_id",
          "geo_block_id",
          "geo_place_id",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .eq("id", serviceId)
      .eq(
        "provider_id",
        provider.id,
      )
      .maybeSingle();

    if (existing.error) {
      return jsonError(
        existing.error.message,
        500,
        "SERVICE_LOOKUP_FAILED",
      );
    }

    const service =
      existing.data as
        | Record<string, any>
        | null;

    if (!service?.id) {
      return jsonError(
        "Service not found.",
        404,
        "SERVICE_NOT_FOUND",
      );
    }

    const trustedDecision =
      await evaluateTrustedPublication(
        "services",
        service.media_assets,
      );

    if (!trustedDecision.ok) {
      return jsonError(
        trustedDecision.message ||
          "Trusted media verification is incomplete.",
        409,
        trustedDecision.code ||
          "TRUSTED_MEDIA_REQUIRED",
        {
          trustedPublication: {
            module: "services",
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
      );
    }

    const title =
      String(
        service.headline ||
          service.custom_service ||
          service.custom_subcategory ||
          service.custom_category ||
          "Service",
      ).trim();

    const category =
      String(
        service.custom_service ||
          service.custom_subcategory ||
          service.custom_category ||
          "General Service",
      ).trim();

    const group =
      String(
        service.custom_category ||
          "Professional / Skilled Services",
      ).trim();

    const numericRate =
      service.min_price ??
      service.max_price ??
      null;

    const timestamp =
      new Date().toISOString();

    const admin = getSupabaseAdmin();

    /*
     * Create or refresh the existing marketplace
     * projection. It always enters moderation as
     * pending and cannot be approved by this route.
     */
    const projectionResult = await admin
      .from("service_listings")
      .upsert(
        {
          provider_service_id:
            service.id,

          owner_id: user.id,

          title,
          description:
            service.service_description ||
            null,

          status: "pending",
          published_at: null,

          group,
          category,

          country:
            provider.country || "India",
          state:
            provider.state || null,
          district:
            provider.district || null,
          city:
            provider.city || null,

          pricing_unit:
            service.pricing_kind ||
            null,
          rate: numericRate,

          /*
           * Preserve complete UploadedMediaAsset
           * evidence. The admin decision endpoint
           * re-evaluates this persisted field.
           */
          photos:
            Array.isArray(
              service.media_assets,
            )
              ? service.media_assets
              : [],

          geo_state_id:
            service.geo_state_id ||
            null,
          geo_district_id:
            service.geo_district_id ||
            null,
          geo_subdivision_id:
            service.geo_subdivision_id ||
            null,
          geo_block_id:
            service.geo_block_id ||
            null,
          geo_place_id:
            service.geo_place_id ||
            null,

          updated_at: timestamp,
        },
        {
          onConflict:
            "provider_service_id",
        },
      )
      .select(
        "id,provider_service_id,status",
      )
      .single();

    if (projectionResult.error) {
      console.error(
        "[services-submit-for-review] projection failed",
        projectionResult.error,
      );

      return jsonError(
        projectionResult.error.message,
        500,
        "SERVICE_PROJECTION_FAILED",
      );
    }

    const providerUpdate = await admin
      .from("provider_services")
      .update({
        record_status: "pending",
        is_active: false,
        updated_at: timestamp,
      })
      .eq("id", service.id)
      .eq(
        "provider_id",
        provider.id,
      )
      .select("id,record_status")
      .single();

    if (providerUpdate.error) {
      console.error(
        "[services-submit-for-review] provider status failed",
        providerUpdate.error,
      );

      return jsonError(
        providerUpdate.error.message,
        500,
        "SERVICE_SUBMISSION_FAILED",
      );
    }

    return NextResponse.json({
      ok: true,

      data: {
        providerService:
          providerUpdate.data,
        marketplaceListing:
          projectionResult.data,
      },

      trustedPublication: {
        module: "services",
        requiredCaptures:
          trustedDecision.requiredCaptures,
        completedCaptures:
          trustedDecision.completedCaptures,
        serverVerified: true,
      },
    });
  } catch (error: any) {
    console.error(
      "[services-submit-for-review] fatal",
      error,
    );

    return jsonError(
      error?.message ||
        "Unknown server error.",
      500,
      "SERVER_ERROR",
    );
  }
}

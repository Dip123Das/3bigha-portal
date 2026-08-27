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

type ServiceDecision =
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
): ServiceDecision | null {
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
    );

    if (
      role !== "master_admin" &&
      role !== "services_admin"
    ) {
      return jsonError(
        "Services admin authority required.",
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
      .from("service_listings")
      .select(
        "id,status,photos,provider_service_id",
      )
      .eq("id", listingId)
      .maybeSingle();

    if (listingResult.error) {
      return jsonError(
        "Unable to read service listing.",
        500,
        "LISTING_LOOKUP_FAILED",
      );
    }

    if (!listingResult.data?.id) {
      return jsonError(
        "Service listing not found.",
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
          "services",
          listingResult.data.photos,
        );

      if (!trustedPublication.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code:
                "TRUSTED_PUBLICATION_BLOCKED",
              message:
                trustedPublication.message ||
                "Service listing cannot be approved because Trusted Publication requirements are incomplete.",
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
      .from("service_listings")
      .update({
        status: decision,
        published_at:
          decision === "approved"
            ? timestamp
            : null,
        updated_at: timestamp,
      })
      .eq("id", listingId)
      .select(
        "id,status,published_at,updated_at",
      )
      .single();

    if (updateResult.error) {
      return jsonError(
        "Unable to update service listing.",
        500,
        "LISTING_UPDATE_FAILED",
      );
    }

    /*
     * Keep the provider workspace record aligned
     * with the existing marketplace moderation
     * record.
     */
    const providerServiceId = String(
      listingResult.data.provider_service_id ||
        "",
    ).trim();

    if (providerServiceId) {
      const providerStatus =
        decision === "approved"
          ? "published"
          : decision;

      const providerUpdate = await admin
        .from("provider_services")
        .update({
          record_status:
            providerStatus,
          is_active:
            decision === "approved",
          updated_at: timestamp,
        })
        .eq(
          "id",
          providerServiceId,
        );

      if (providerUpdate.error) {
        console.error(
          "[admin/services/decision] provider projection sync failed",
          providerUpdate.error,
        );

        return jsonError(
          "Marketplace decision succeeded, but the provider service status could not be synchronized.",
          500,
          "PROVIDER_SERVICE_SYNC_FAILED",
        );
      }
    }

    return NextResponse.json({
      ok: true,
      listing: updateResult.data,
      decision,
      trustedPublication,
    });
  } catch (error: any) {
    console.error(
      "[admin/services/decision] fatal",
      error,
    );

    return jsonError(
      error?.message ||
        "Unexpected Services decision failure.",
      500,
      "SERVER_ERROR",
    );
  }
}

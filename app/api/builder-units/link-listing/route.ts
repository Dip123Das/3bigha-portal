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
  buildTrustedPublicationContext,
  validateTrustedPublication,
} from "@/lib/media/trusted-publication-gate";

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

function normalizeId(
  value: unknown,
): string {
  return String(value ?? "").trim();
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

    const body = await request
      .json()
      .catch(() => null);

    const unitId =
      normalizeId(body?.unitId);

    const listingId =
      normalizeId(body?.listingId);

    if (!unitId) {
      return jsonError(
        "unitId is required.",
        400,
        "UNIT_ID_REQUIRED",
      );
    }

    const admin = getSupabaseAdmin();

    /*
     * Resolve administrative authority without
     * trusting any role supplied by the browser.
     */
    const profileResult = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const profile =
      profileResult.data as
        | Record<string, unknown>
        | null;

    const role = String(
      profile?.role ?? "",
    )
      .trim()
      .toLowerCase();

    const isAdmin = new Set([
      "master_admin",
      "property_admin",
      "admin",
    ]).has(role);

    /*
     * SERVER TRUST BOUNDARY
     *
     * The unit and its persisted evidence are always
     * loaded from the database. The browser cannot
     * declare the unit trusted.
     */
    const unitResult = await admin
      .from("builder_inventory_units")
      .select(
        [
          "id",
          "project_id",
          "builder_project_id",
          "builder_profile_id",
          "owner_user_id",
          "unit_code",
          "title",
          "trust_status",
          "trusted_media_json",
          "trusted_publication",
        ].join(","),
      )
      .eq("id", unitId)
      .maybeSingle();

    if (unitResult.error) {
      return jsonError(
        unitResult.error.message,
        500,
        "UNIT_LOOKUP_FAILED",
      );
    }

    const unit =
      unitResult.data as
        | Record<string, any>
        | null;

    if (!unit?.id) {
      return jsonError(
        "Builder inventory unit not found.",
        404,
        "UNIT_NOT_FOUND",
      );
    }

    const unitOwnerId =
      normalizeId(unit.owner_user_id);

    /*
     * Existing builder records may not all contain
     * owner_user_id, so project ownership is checked
     * as a secondary authoritative source.
     */
    const projectId =
      normalizeId(
        unit.project_id ||
          unit.builder_project_id,
      );

    if (!projectId) {
      return jsonError(
        "The builder unit has no valid project relationship.",
        409,
        "UNIT_PROJECT_MISSING",
      );
    }

    const projectResult = await admin
      .from("builder_projects")
      .select(
        "id,owner_user_id,builder_profile_id",
      )
      .eq("id", projectId)
      .maybeSingle();

    if (projectResult.error) {
      return jsonError(
        projectResult.error.message,
        500,
        "PROJECT_LOOKUP_FAILED",
      );
    }

    const project =
      projectResult.data as
        | Record<string, any>
        | null;

    const projectOwnerId =
      normalizeId(
        project?.owner_user_id,
      );

    const ownsUnit =
      unitOwnerId === user.id ||
      projectOwnerId === user.id;

    if (!isAdmin && !ownsUnit) {
      return jsonError(
        "You do not have authority to manage this builder unit.",
        403,
        "FORBIDDEN",
      );
    }

    /*
     * An empty listingId means unlink.
     *
     * Unlinking does not expose the unit publicly,
     * so Trusted Publication readiness is not needed.
     */
    if (!listingId) {
      const deleteResult = await admin
        .from("property_listing_sources")
        .delete()
        .eq("unit_id", unitId)
        .eq(
          "source_kind",
          "builder_inventory",
        );

      if (deleteResult.error) {
        return jsonError(
          deleteResult.error.message,
          500,
          "UNIT_UNLINK_FAILED",
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          unitId,
          listingId: null,
          linked: false,
        },
      });
    }

    /*
     * Validate canonical unit-specific evidence.
     * Project-level trusted media is never used here.
     */
    const mediaAssets = Array.isArray(
      unit.trusted_media_json,
    )
      ? unit.trusted_media_json
      : [];

    const trustedResult =
      await validateTrustedPublication(
        "property",
        mediaAssets,
        {
          listingKind:
            "builder_unit",
        },
      );

    const trustedContext =
      buildTrustedPublicationContext(
        mediaAssets,
      );

    if (!trustedResult.ok) {
      return jsonError(
        trustedResult.message ||
          "This builder unit requires one genuine live GPS capture before it can be linked to a property listing.",
        409,
        trustedResult.code ||
          "BUILDER_UNIT_TRUST_REQUIRED",
        {
          trustedPublication: {
            module: "property",
            listingKind:
              "builder_unit",

            requiredCaptures:
              trustedResult.requiredCaptures,

            completedCaptures:
              trustedResult.completedCaptures,

            gpsVerified:
              trustedContext.gpsVerified ===
              true,

            provenanceVerified:
              trustedContext
                .provenanceVerified ===
              true,

            captureSessionCompleted:
              trustedContext
                .captureSessionCompleted ===
              true,

            aiVerificationStatus:
              trustedContext
                .aiVerificationStatus ??
              "not_started",
          },
        },
      );
    }

    const listingResult = await admin
      .from("property_listings")
      .select(
        [
          "id",
          "owner_id",
          "owner_user_id",
          "vendor_user_id",
          "builder_project_id",
          "is_builder_listing",
          "status",
        ].join(","),
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

    const listing =
      listingResult.data as
        | Record<string, any>
        | null;

    if (!listing?.id) {
      return jsonError(
        "Property listing not found.",
        404,
        "LISTING_NOT_FOUND",
      );
    }

    const listingOwnerIds = new Set(
      [
        listing.owner_id,
        listing.owner_user_id,
        listing.vendor_user_id,
      ]
        .map(normalizeId)
        .filter(Boolean),
    );

    if (
      !isAdmin &&
      !listingOwnerIds.has(user.id)
    ) {
      return jsonError(
        "You do not have authority to link this property listing.",
        403,
        "LISTING_FORBIDDEN",
      );
    }

    if (
      listing.is_builder_listing !== true
    ) {
      return jsonError(
        "Only a Builder Property listing can be linked to a Builder inventory unit.",
        409,
        "NOT_BUILDER_LISTING",
      );
    }

    const listingProjectId =
      normalizeId(
        listing.builder_project_id,
      );

    if (
      !listingProjectId ||
      listingProjectId !== projectId
    ) {
      return jsonError(
        "The Builder Unit and Property Listing must belong to the same Builder Project.",
        409,
        "PROJECT_MISMATCH",
      );
    }

    /*
     * A unit may have only one listing relationship.
     * Clear any earlier source row before creating
     * the canonical linkage.
     */
    const clearResult = await admin
      .from("property_listing_sources")
      .delete()
      .eq("unit_id", unitId)
      .eq(
        "source_kind",
        "builder_inventory",
      );

    if (clearResult.error) {
      return jsonError(
        clearResult.error.message,
        500,
        "OLD_UNIT_LINK_CLEAR_FAILED",
      );
    }

    const timestamp =
      new Date().toISOString();

    const linkResult = await admin
      .from("property_listing_sources")
      .upsert(
        {
          property_id: listingId,
          source_kind:
            "builder_inventory",
          project_id: projectId,
          unit_id: unitId,
          updated_at: timestamp,
        },
        {
          onConflict: "property_id",
        },
      )
      .select(
        "id,property_id,project_id,unit_id,source_kind",
      )
      .single();

    if (linkResult.error) {
      return jsonError(
        linkResult.error.message,
        500,
        "UNIT_LINK_FAILED",
      );
    }

    /*
     * Persist a server-derived readiness snapshot.
     * The browser's earlier snapshot is never treated
     * as authoritative by this endpoint.
     */
    const unitUpdateResult = await admin
      .from("builder_inventory_units")
      .update({
        trust_status: "verified",

        trusted_publication: {
          module: "property",
          listingKind:
            "builder_unit",

          requiredCaptures:
            trustedResult.requiredCaptures,

          completedCaptures:
            trustedResult.completedCaptures,

          gpsVerified:
            trustedContext.gpsVerified ===
            true,

          provenanceVerified:
            trustedContext
              .provenanceVerified ===
            true,

          captureSessionCompleted:
            trustedContext
              .captureSessionCompleted ===
            true,

          aiVerificationStatus:
            trustedContext
              .aiVerificationStatus ??
            "not_started",

          serverVerified: true,
          verifiedAt: timestamp,
        },

        updated_at: timestamp,
      } as any)
      .eq("id", unitId);

    if (unitUpdateResult.error) {
      console.error(
        "[builder-units/link-listing] trust snapshot update failed",
        unitUpdateResult.error,
      );

      return jsonError(
        "The unit was linked, but its server trust snapshot could not be updated.",
        500,
        "UNIT_TRUST_SYNC_FAILED",
      );
    }

    return NextResponse.json({
      ok: true,

      data: {
        unitId,
        listingId,
        linked: true,
        source: linkResult.data,
      },

      trustedPublication: {
        module: "property",
        listingKind:
          "builder_unit",

        requiredCaptures:
          trustedResult.requiredCaptures,

        completedCaptures:
          trustedResult.completedCaptures,

        serverVerified: true,
      },
    });
  } catch (error: any) {
    console.error(
      "[builder-units/link-listing] fatal",
      error,
    );

    return jsonError(
      error?.message ||
        "Unexpected Builder Unit linkage failure.",
      500,
      "SERVER_ERROR",
    );
  }
}

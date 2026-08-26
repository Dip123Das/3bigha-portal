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

type TurnkeyDecision =
  | "published"
  | "rejected"
  | "pending"
  | "draft";

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
): TurnkeyDecision | null {
  const decision = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    decision === "published" ||
    decision === "rejected" ||
    decision === "pending" ||
    decision === "draft"
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

    const packageId = String(
      body?.packageId || "",
    ).trim();

    const decision =
      normalizeDecision(body?.decision);

    if (!packageId) {
      return jsonError(
        "packageId is required.",
        400,
        "PACKAGE_ID_REQUIRED",
      );
    }

    if (!decision) {
      return jsonError(
        "decision must be published, rejected, pending, or draft.",
        400,
        "INVALID_DECISION",
      );
    }

    const admin = getSupabaseAdmin();

    const packageResult = await admin
      .from("provider_turnkey_packages")
      .select(
        "id,record_status,media_assets",
      )
      .eq("id", packageId)
      .maybeSingle();

    if (packageResult.error) {
      return jsonError(
        "Unable to read Turnkey package.",
        500,
        "PACKAGE_LOOKUP_FAILED",
      );
    }

    if (!packageResult.data?.id) {
      return jsonError(
        "Turnkey package not found.",
        404,
        "PACKAGE_NOT_FOUND",
      );
    }

    let trustedPublication:
      | Awaited<
          ReturnType<
            typeof evaluateTrustedPublication
          >
        >
      | null = null;

    if (decision === "published") {
      trustedPublication =
        await evaluateTrustedPublication(
          "services",
          packageResult.data.media_assets,
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
                "Turnkey package cannot be published because Trusted Publication requirements are incomplete.",
            },
            trustedPublication,
          },
          { status: 409 },
        );
      }
    }

    const updateResult = await admin
      .from("provider_turnkey_packages")
      .update({
        record_status: decision,
        is_active:
          decision === "published",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", packageId)
      .select(
        "id,record_status,is_active,updated_at",
      )
      .single();

    if (updateResult.error) {
      return jsonError(
        "Unable to update Turnkey package.",
        500,
        "PACKAGE_UPDATE_FAILED",
      );
    }

    return NextResponse.json({
      ok: true,
      package: updateResult.data,
      decision,
      trustedPublication,
    });
  } catch (error: any) {
    console.error(
      "[admin/turnkey/decision] fatal",
      error,
    );

    return jsonError(
      error?.message ||
        "Unexpected Turnkey decision failure.",
      500,
      "SERVER_ERROR",
    );
  }
}

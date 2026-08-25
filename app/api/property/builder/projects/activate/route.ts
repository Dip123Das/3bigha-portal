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

    const projectId = String(
      body?.projectId || "",
    ).trim();

    if (!projectId) {
      return NextResponse.json(
        {
          error: {
            code: "PROJECT_ID_REQUIRED",
            message: "projectId is required.",
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
     * Ownership and Trusted Listing Media evidence
     * are read from persisted database state.
     * Client-declared trust readiness is ignored.
     */
    const existing = await supabase
      .from("builder_projects")
      .select(`
        id,
        builder_profile_id,
        status,
        trusted_media_json,
        builder_profiles!inner (
          id,
          owner_user_id
        )
      `)
      .eq("id", projectId)
      .eq(
        "builder_profiles.owner_user_id",
        user.id,
      )
      .maybeSingle();

    if (existing.error) {
      console.error(
        "[builder-project-activate] lookup",
        existing.error,
      );

      return NextResponse.json(
        {
          error: {
            code: "PROJECT_LOOKUP_FAILED",
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
            code: "PROJECT_NOT_FOUND",
            message:
              "Builder project not found.",
          },
        },
        { status: 404 },
      );
    }

    /*
     * Activation is idempotent.
     */
    if (
      String(existing.data.status || "")
        .trim()
        .toLowerCase() === "active"
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          status: "active",
        },
      });
    }

    const trustedDecision =
      await evaluateTrustedPublication(
        "builder_project",
        existing.data.trusted_media_json,
      );

    console.log(
      "[builder-project-activate] trusted-media",
      {
        projectId,
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
              module: "builder_project",
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
     * repeat ownership binding on the write.
     *
     * builder_profile_id comes from the already
     * authenticated ownership lookup above.
     */
    const updateRes = await supabase
      .from("builder_projects")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", projectId)
      .eq(
        "builder_profile_id",
        existing.data.builder_profile_id,
      )
      .select("id,status")
      .single();

    if (updateRes.error) {
      console.error(
        "[builder-project-activate] update",
        updateRes.error,
      );

      return NextResponse.json(
        {
          error: {
            code: "ACTIVATION_FAILED",
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
        module: "builder_project",
        requiredCaptures:
          trustedDecision.requiredCaptures,
        completedCaptures:
          trustedDecision.completedCaptures,
        serverVerified: true,
      },
    });
  } catch (e: any) {
    console.error(
      "[builder-project-activate] fatal",
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

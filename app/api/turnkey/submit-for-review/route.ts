import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getSupabaseServerClient,
} from "@/lib/supabaseServer";
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

    const packageId = String(
      body?.packageId || "",
    ).trim();

    if (!packageId) {
      return NextResponse.json(
        {
          error: {
            code: "PACKAGE_ID_REQUIRED",
            message: "packageId is required.",
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

    const providerResult = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      providerResult.error ||
      !providerResult.data?.id
    ) {
      return NextResponse.json(
        {
          error: {
            code: "PROVIDER_NOT_FOUND",
            message:
              providerResult.error?.message ||
              "Service provider profile not found.",
          },
        },
        {
          status: providerResult.error
            ? 500
            : 404,
        },
      );
    }

    const existing = await supabase
      .from("provider_turnkey_packages")
      .select(
        "id,provider_id,record_status,media_assets",
      )
      .eq("id", packageId)
      .eq(
        "provider_id",
        providerResult.data.id,
      )
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        {
          error: {
            code: "PACKAGE_LOOKUP_FAILED",
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
            code: "PACKAGE_NOT_FOUND",
            message:
              "Turnkey package not found.",
          },
        },
        { status: 404 },
      );
    }

    if (
      existing.data.record_status === "pending"
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          record_status: "pending",
        },
      });
    }

    if (
      existing.data.record_status === "published"
    ) {
      return NextResponse.json({
        ok: true,
        data: {
          id: existing.data.id,
          record_status: "published",
        },
      });
    }

    const trustedDecision =
      await evaluateTrustedPublication(
        "services",
        existing.data.media_assets,
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
              "Trusted Turnkey media verification is incomplete.",
            trustedPublication: {
              module: "turnkey",
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

    const updateResult = await supabase
      .from("provider_turnkey_packages")
      .update({
        record_status: "pending",
        updated_at:
          new Date().toISOString(),
      } as any)
      .eq("id", packageId)
      .eq(
        "provider_id",
        providerResult.data.id,
      )
      .select("id,record_status")
      .single();

    if (updateResult.error) {
      return NextResponse.json(
        {
          error: {
            code:
              "PACKAGE_SUBMISSION_FAILED",
            message:
              updateResult.error.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: updateResult.data,
      trustedPublication: {
        module: "turnkey",
        requiredCaptures:
          trustedDecision.requiredCaptures,
        completedCaptures:
          trustedDecision.completedCaptures,
        serverVerified: true,
      },
    });
  } catch (error: any) {
    console.error(
      "[turnkey-submit-for-review] fatal",
      error,
    );

    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message:
            error?.message ||
            "Unknown server error.",
        },
      },
      { status: 500 },
    );
  }
}

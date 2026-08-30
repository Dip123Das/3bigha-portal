import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

import {
  TrustedCaptureSessionError,
  completeTrustedCaptureSession,
} from "@/lib/trusted-media";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function jsonError(
  message: string,
  status: number,
  code = "TRUSTED_MEDIA_ERROR"
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
    },
    { status }
  );
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    if (!sessionId?.trim()) {
      return jsonError(
        "Trusted capture session ID is required.",
        400,
        "SESSION_ID_REQUIRED"
      );
    }

    const cookieStore = await cookies();
    const supabase =
      getSupabaseServerClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.id) {
      return jsonError(
        "You must be signed in to complete a trusted capture session.",
        401,
        "UNAUTHENTICATED"
      );
    }

    const body = await request.json().catch(
      () => null
    );

    if (!body || typeof body !== "object") {
      return jsonError(
        "A valid JSON request body is required.",
        400,
        "INVALID_REQUEST"
      );
    }

    const nonce =
      typeof (
        body as Record<string, unknown>
      ).nonce === "string"
        ? String(
            (
              body as Record<string, unknown>
            ).nonce
          ).trim()
        : "";

    if (!nonce) {
      return jsonError(
        "Trusted capture session token is required.",
        400,
        "NONCE_REQUIRED"
      );
    }

    const session =
      await completeTrustedCaptureSession({
        ownerUserId: user.id,
        sessionId: sessionId.trim(),
        nonce,
      });

    return NextResponse.json(
      {
        ok: true,
        session,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (
      error instanceof TrustedCaptureSessionError
    ) {
      return jsonError(
        error.message,
        error.status,
        error.code
      );
    }

    console.error(
      "Trusted capture session completion failed:",
      error
    );

    return jsonError(
      "Unable to complete trusted capture session.",
      500,
      "INTERNAL_ERROR"
    );
  }
}

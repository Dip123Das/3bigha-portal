import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

import {
  TRUSTED_MEDIA_EVIDENCE_POLICIES,
  TrustedCaptureSessionError,
  createTrustedCaptureSession,
} from "@/lib/trusted-media";

import type {
  TrustedMediaEntityType,
  TrustedMediaPlatform,
} from "@/lib/trusted-media";

const VALID_PLATFORMS = new Set<TrustedMediaPlatform>([
  "web",
  "android",
  "ios",
  "unknown",
]);

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

function isTrustedMediaEntityType(
  value: unknown
): value is TrustedMediaEntityType {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(
      TRUSTED_MEDIA_EVIDENCE_POLICIES,
      value
    )
  );
}

function normalizeOptionalString(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
}

function normalizePlatform(
  value: unknown
): TrustedMediaPlatform {
  if (
    typeof value === "string" &&
    VALID_PLATFORMS.has(
      value as TrustedMediaPlatform
    )
  ) {
    return value as TrustedMediaPlatform;
  }

  return "unknown";
}

export async function POST(request: Request) {
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
        "You must be signed in to start a trusted live capture.",
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

    const entityType = (
      body as Record<string, unknown>
    ).entityType;

    if (!isTrustedMediaEntityType(entityType)) {
      return jsonError(
        "A supported listing entity type is required.",
        400,
        "INVALID_ENTITY_TYPE"
      );
    }

    const entityId = normalizeOptionalString(
      (body as Record<string, unknown>).entityId
    );

    const draftToken = normalizeOptionalString(
      (body as Record<string, unknown>).draftToken
    );

    if (!entityId && !draftToken) {
      return jsonError(
        "Either an existing listing ID or a draft token is required.",
        400,
        "ENTITY_REFERENCE_REQUIRED"
      );
    }

    const result =
      await createTrustedCaptureSession({
        ownerUserId: user.id,
        businessId: normalizeOptionalString(
          (body as Record<string, unknown>)
            .businessId
        ),
        entityType,
        entityId,
        draftToken,
        platform: normalizePlatform(
          (body as Record<string, unknown>)
            .platform
        ),
        appVersion: normalizeOptionalString(
          (body as Record<string, unknown>)
            .appVersion
        ),
        deviceSessionId:
          normalizeOptionalString(
            (body as Record<string, unknown>)
              .deviceSessionId
          ),
      });

    return NextResponse.json(
      {
        ok: true,
        session: result.session,
        nonce: result.nonce,
      },
      {
        status: 201,
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
      "Trusted capture session creation failed:",
      error
    );

    return jsonError(
      "Unable to start trusted live capture.",
      500,
      "INTERNAL_ERROR"
    );
  }
}

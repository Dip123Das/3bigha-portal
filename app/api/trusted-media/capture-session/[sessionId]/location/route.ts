import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

import {
  TrustedCaptureSessionError,
  attachTrustedCaptureLocation,
} from "@/lib/trusted-media";

import type {
  TrustedLocationObservation,
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

function finiteNumber(
  value: unknown
): number | null {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" &&
          value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(numberValue)
    ? numberValue
    : null;
}

function optionalFiniteNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return finiteNumber(value);
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

function parseLocation(
  value: unknown
): TrustedLocationObservation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const latitude = finiteNumber(record.latitude);
  const longitude = finiteNumber(record.longitude);
  const accuracyMetres = finiteNumber(
    record.accuracyMetres
  );

  const capturedAt =
    typeof record.capturedAt === "string"
      ? record.capturedAt.trim()
      : "";

  if (
    latitude === null ||
    longitude === null ||
    accuracyMetres === null ||
    !capturedAt
  ) {
    return null;
  }

  const altitudeMetres =
    optionalFiniteNumber(record.altitudeMetres);

  return {
    latitude,
    longitude,
    accuracyMetres,
    capturedAt,
    altitudeMetres,
    provider: normalizeOptionalString(
      record.provider
    ),
  };
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
        "You must be signed in to attach trusted location evidence.",
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

    const record =
      body as Record<string, unknown>;

    const nonce =
      typeof record.nonce === "string"
        ? record.nonce.trim()
        : "";

    if (!nonce) {
      return jsonError(
        "Trusted capture session token is required.",
        400,
        "NONCE_REQUIRED"
      );
    }

    const location = parseLocation(
      record.location
    );

    if (!location) {
      return jsonError(
        "A valid fresh GPS location is required.",
        400,
        "LOCATION_REQUIRED"
      );
    }

    const session =
      await attachTrustedCaptureLocation({
        ownerUserId: user.id,
        sessionId: sessionId.trim(),
        nonce,
        location,
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
      "Trusted location attachment failed:",
      error
    );

    return jsonError(
      "Unable to attach trusted location evidence.",
      500,
      "INTERNAL_ERROR"
    );
  }
}

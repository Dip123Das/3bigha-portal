import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
  type MobileTrustedLocationObservation,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  TrustedCaptureSessionError,
  attachTrustedCaptureLocation,
} from "@/lib/trusted-media";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

const clean = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function invalidLocation(message: string) {
  return NextResponse.json(
    mobileFailure("TRUSTED_MEDIA_FAILED", message),
    {
      status: 400,
      headers: NO_STORE_HEADERS,
    },
  );
}

function failure(error: unknown) {
  if (error instanceof MobileAuthError) {
    return NextResponse.json(
      mobileFailure(error.code, error.message),
      {
        status: error.code === "CONFIGURATION_ERROR" ? 500 : 401,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  if (error instanceof TrustedCaptureSessionError) {
    return NextResponse.json(
      mobileFailure(
        "TRUSTED_MEDIA_FAILED",
        error.message,
        error.status >= 500,
      ),
      {
        status: error.status,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  console.error("MOBILE_TRUSTED_CAPTURE_LOCATION_FAILED", error);

  return NextResponse.json(
    mobileFailure(
      "TRUSTED_MEDIA_FAILED",
      "The live GPS observation could not be bound to this capture.",
      true,
    ),
    {
      status: 500,
      headers: NO_STORE_HEADERS,
    },
  );
}

export async function POST(
  request: Request,
  context: { params: { sessionId: string } },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return invalidLocation("A valid live GPS observation is required.");
    }

    const record = body as Record<string, unknown>;
    const location =
      record.location && typeof record.location === "object"
        ? record.location as Record<string, unknown>
        : null;

    if (!location) {
      return invalidLocation("Live GPS coordinates are required.");
    }

    const sessionId = clean(context.params.sessionId, 80);
    const nonce = clean(record.nonce, 256);
    const latitude = finiteNumber(location.latitude);
    const longitude = finiteNumber(location.longitude);
    const accuracyMetres = finiteNumber(location.accuracyMetres);
    const altitudeMetres = finiteNumber(location.altitudeMetres);
    const capturedAt = clean(location.capturedAt, 80);

    if (!sessionId || !nonce) {
      return invalidLocation(
        "Trusted capture-session credentials are required.",
      );
    }

    if (
      latitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude === null ||
      longitude < -180 ||
      longitude > 180
    ) {
      return invalidLocation("Live GPS coordinates are invalid.");
    }

    if (accuracyMetres === null || accuracyMetres <= 0) {
      return invalidLocation(
        "The device must provide a valid GPS accuracy.",
      );
    }

    if (!capturedAt || Number.isNaN(Date.parse(capturedAt))) {
      return invalidLocation(
        "The GPS observation time is missing or invalid.",
      );
    }

    const observation: MobileTrustedLocationObservation = {
      latitude,
      longitude,
      accuracyMetres,
      altitudeMetres,
      capturedAt,
      provider: clean(location.provider, 80) || null,
    };

    const session = await attachTrustedCaptureLocation({
      ownerUserId: auth.user.id,
      sessionId,
      nonce,
      location: observation,
    });

    return NextResponse.json(mobileSuccess(session), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return failure(error);
  }
}

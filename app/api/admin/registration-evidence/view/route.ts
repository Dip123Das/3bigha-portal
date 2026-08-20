import { NextResponse } from "next/server";

import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "registration-evidence";
const SIGNED_URL_TTL_SECONDS = 120;

function asObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    return [value as Record<string, unknown>];
  }

  return [];
}

function collectOwnedPaths(
  business: Record<string, unknown>
) {
  const paths = new Set<string>();

  for (const asset of [
    ...asObjects(business.selfie_media_json),
    ...asObjects(business.workplace_media_json),
    ...asObjects(business.business_media_json),
  ]) {
    if (
      asset.bucket === BUCKET &&
      typeof asset.path === "string"
    ) {
      paths.add(asset.path);
    }
  }

  return paths;
}

function errorResponse(
  message: string,
  status: number,
  code: string
) {
  return NextResponse.json(
    { ok: false, error: message, code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

export async function GET(request: Request) {
  const access = await requireMasterAdmin();

  if ("error" in access) {
    return errorResponse(
      String(
        access.error ||
          "Master administrator access is required."
      ),
      Number(access.status || 403),
      "ADMIN_ACCESS_REQUIRED"
    );
  }

  const url = new URL(request.url);
  const userId = String(
    url.searchParams.get("user_id") || ""
  ).trim();
  const path = String(
    url.searchParams.get("path") || ""
  ).trim();

  if (!userId || !path) {
    return errorResponse(
      "Evidence owner and path are required.",
      400,
      "INVALID_EVIDENCE_REQUEST"
    );
  }

  const expectedPrefix = `${userId}/registration/`;

  if (
    !path.startsWith(expectedPrefix) ||
    path.includes("..") ||
    path.startsWith("/") ||
    path.includes("\\")
  ) {
    return errorResponse(
      "The requested evidence path is invalid.",
      400,
      "INVALID_EVIDENCE_PATH"
    );
  }

  const { data: business, error } =
    await access.admin
      .from("business_profiles")
      .select(
        [
          "user_id",
          "selfie_media_json",
          "workplace_media_json",
          "business_media_json",
        ].join(",")
      )
      .eq("user_id", userId)
      .maybeSingle();

  if (error) {
    return errorResponse(
      "Registration evidence ownership could not be verified.",
      500,
      "EVIDENCE_OWNERSHIP_CHECK_FAILED"
    );
  }

  if (!business) {
    return errorResponse(
      "The selected business registration was not found.",
      404,
      "BUSINESS_NOT_FOUND"
    );
  }

  if (
    !collectOwnedPaths(
      business as unknown as Record<
        string,
        unknown
      >
    ).has(path)
  ) {
    return errorResponse(
      "The requested evidence is not attached to this registration.",
      403,
      "EVIDENCE_NOT_OWNED"
    );
  }

  const { data, error: signedUrlError } =
    await access.admin.storage
      .from(BUCKET)
      .createSignedUrl(
        path,
        SIGNED_URL_TTL_SECONDS
      );

  if (signedUrlError || !data?.signedUrl) {
    return errorResponse(
      "A secure evidence link could not be created.",
      500,
      "SIGNED_URL_CREATION_FAILED"
    );
  }

  return NextResponse.redirect(
    data.signedUrl,
    {
      status: 302,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}

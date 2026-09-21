import { NextResponse } from "next/server";

import {
  mobileFailure,
  mobileSuccess,
} from "@/lib/mobile/contracts/v1";
import {
  MobileAuthError,
  authenticateMobileRequest,
} from "@/lib/mobile/server/auth";
import {
  MobilePropertyLegalReviewError,
  createMobilePropertyLegalDocumentAccess,
} from "@/lib/mobile/server/property-legal-review";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function errorResponse(error: unknown) {
  if (error instanceof MobileAuthError) {
    const status =
      error.code === "CONFIGURATION_ERROR" ? 500 : 401;
    return NextResponse.json(
      mobileFailure(error.code, error.message),
      { status, headers },
    );
  }

  if (error instanceof MobilePropertyLegalReviewError) {
    return NextResponse.json(
      mobileFailure(
        "PROPERTY_LEGAL_REVIEW_FAILED",
        error.message,
      ),
      { status: error.status, headers },
    );
  }

  console.error("MOBILE_PROPERTY_LEGAL_DOCUMENT_ACCESS_FAILED", error);
  return NextResponse.json(
    mobileFailure(
      "PROPERTY_LEGAL_REVIEW_FAILED",
      "Temporary legal-paper access could not be created.",
      true,
    ),
    { status: 500, headers },
  );
}

export async function POST(
  request: Request,
  context: {
    params: {
      requestId: string;
      documentId: string;
    };
  },
) {
  try {
    const auth = await authenticateMobileRequest(request);
    const access = await createMobilePropertyLegalDocumentAccess({
      buyerUserId: auth.user.id,
      requestId: clean(context.params.requestId),
      documentId: clean(context.params.documentId),
    });

    return NextResponse.json(mobileSuccess(access), {
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

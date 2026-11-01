import Razorpay from "razorpay";
import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/requireAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

function failure(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: HEADERS },
  );
}

export async function POST(request: Request) {
  try {
    const access = await requireAdminAccess({
      request,
      allowedRoles: ["master_admin"],
    });

    if (access.error) {
      return failure(access.error, access.status ?? 500);
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

    if (
      process.env.RAZORPAY_ENABLED !== "true" ||
      process.env.RAZORPAY_ROUTE_ENABLED !== "true" ||
      !keyId ||
      !keySecret
    ) {
      return failure("Razorpay Route account verification is not configured.", 503);
    }

    const body = await request.json().catch(() => null);
    const ownerUserId = String(body?.ownerUserId ?? "").trim();

    if (!UUID.test(ownerUserId)) {
      return failure("Enter a valid seller reference.", 400);
    }

    const { data: mapping, error: mappingError } = await access.admin
      .from("property_seller_razorpay_route_accounts")
      .select("razorpay_linked_account_id,status")
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();

    if (mappingError) {
      return failure("Seller Route account could not be loaded.", 503);
    }
    if (!mapping) {
      return failure("Seller Route account was not found.", 404);
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const providerAccount = await razorpay.accounts.fetch(
      mapping.razorpay_linked_account_id,
    );

    if (providerAccount.id !== mapping.razorpay_linked_account_id) {
      return failure("Razorpay returned a different linked account.", 502);
    }

    const activatedAt = Number(providerAccount.activated_at);
    const providerActivatedAt = Number.isFinite(activatedAt) && activatedAt > 0
      ? new Date(activatedAt * 1000).toISOString()
      : null;
    const providerStatus = String(providerAccount.status || "unknown").trim();

    const { data: refreshed, error: refreshError } = await access.admin.rpc(
      "refresh_property_seller_razorpay_route_account",
      {
        target_owner_user_id: ownerUserId,
        target_actor_user_id: access.user.id,
        target_provider_status: providerStatus,
        target_provider_live: providerAccount.live === true,
        target_provider_activated_at: providerActivatedAt,
      },
    );

    if (refreshError || !refreshed) {
      return failure("Verified seller status could not be recorded.", 503);
    }

    return NextResponse.json(
      {
        ok: true,
        status: refreshed.status,
        providerStatus: refreshed.providerStatus,
        providerLive: refreshed.providerLive,
        verifiedAt: new Date().toISOString(),
        message:
          "Razorpay account status refreshed. Route transfer and settlement capabilities remain gated until separately verified.",
      },
      { status: 200, headers: HEADERS },
    );
  } catch {
    return failure("Razorpay could not verify the seller account right now.", 503);
  }
}

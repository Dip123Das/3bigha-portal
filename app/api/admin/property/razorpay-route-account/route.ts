import { NextResponse } from "next/server";

import { requireAdminAccess } from "@/lib/admin/requireAdminAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LINKED_ACCOUNT_ID = /^acc_[A-Za-z0-9]{4,120}$/;
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

export async function GET(request: Request) {
  try {
    const access = await requireAdminAccess({
      request,
      allowedRoles: ["master_admin"],
    });

    if (access.error) {
      return failure(access.error, access.status ?? 500);
    }

    const { data, error } = await access.admin
      .from("property_seller_razorpay_route_accounts")
      .select(
        "owner_user_id,status,details_submitted,transfers_enabled,settlements_enabled,provider_status,provider_live,provider_activated_at,last_verified_at,disabled_at,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return failure("Seller Route readiness could not be loaded.", 503);
    }

    return NextResponse.json(
      {
        ok: true,
        accounts: (data ?? []).map((account) => ({
          sellerUserId: account.owner_user_id,
          status: account.status,
          detailsSubmitted: account.details_submitted,
          transfersEnabled: account.transfers_enabled,
          settlementsEnabled: account.settlements_enabled,
          providerStatus: account.provider_status,
          providerLive: account.provider_live,
          providerActivatedAt: account.provider_activated_at,
          lastVerifiedAt: account.last_verified_at,
          disabledAt: account.disabled_at,
          createdAt: account.created_at,
          updatedAt: account.updated_at,
        })),
      },
      { status: 200, headers: HEADERS },
    );
  } catch {
    return failure("Seller Route readiness could not be loaded.", 503);
  }
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

    const body = await request.json().catch(() => null);
    const ownerUserId = String(body?.ownerUserId ?? "").trim();
    const linkedAccountId = String(body?.linkedAccountId ?? "").trim();

    if (!UUID.test(ownerUserId) || !LINKED_ACCOUNT_ID.test(linkedAccountId)) {
      return failure("Enter a valid seller and Razorpay linked-account reference.", 400);
    }

    const { data, error } = await access.admin.rpc(
      "register_property_seller_razorpay_route_account",
      {
        target_owner_user_id: ownerUserId,
        target_actor_user_id: access.user.id,
        target_linked_account_id: linkedAccountId,
      },
    );

    if (error) {
      const providerConflict = error.code === "23505";
      const sellerMissing = error.message.includes(
        "PROPERTY_ROUTE_SELLER_NOT_FOUND",
      );
      return failure(
        sellerMissing
          ? "The seller account was not found."
          : providerConflict
            ? "This Razorpay linked account is already assigned to another seller."
            : "The linked account could not be registered.",
        sellerMissing ? 404 : providerConflict ? 409 : 503,
      );
    }
    if (!data) {
      return failure("The linked account could not be registered.", 503);
    }

    return NextResponse.json(
      {
        ok: true,
        status: "review_pending" as const,
        message:
          "Seller Route account recorded for verification. Property payments remain disabled until Razorpay capabilities are independently verified.",
      },
      { status: 200, headers: HEADERS },
    );
  } catch {
    return failure("Seller Route account could not be registered.", 503);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireAdminAccess({
      request,
      allowedRoles: ["master_admin"],
    });

    if (access.error) {
      return failure(access.error, access.status ?? 500);
    }

    const body = await request.json().catch(() => null);
    const ownerUserId = String(body?.ownerUserId ?? "").trim();

    if (!UUID.test(ownerUserId)) {
      return failure("Enter a valid seller reference.", 400);
    }

    const { data, error } = await access.admin.rpc(
      "disable_property_seller_razorpay_route_account",
      {
        target_owner_user_id: ownerUserId,
        target_actor_user_id: access.user.id,
      },
    );

    if (error) {
      const missing = error.message.includes(
        "PROPERTY_ROUTE_ACCOUNT_NOT_FOUND",
      );
      return failure(
        missing
          ? "Seller Route account was not found."
          : "Seller Route account could not be disabled.",
        missing ? 404 : 503,
      );
    }
    if (!data) {
      return failure("Seller Route account could not be disabled.", 503);
    }

    return NextResponse.json(
      { ok: true, status: "disabled" },
      { status: 200, headers: HEADERS },
    );
  } catch {
    return failure("Seller Route account could not be disabled.", 503);
  }
}

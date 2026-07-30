"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { BusinessOsRenderer } from "@/components/3bos/framework";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { createVendorBusinessOsProjection } from "@/lib/3bos/projections/create-vendor-business-os-projection";

type PreviewSignals = {
  businessName: string;
  profileComplete: boolean;
  active: boolean;
  readinessPercent: number | null;
  activeSegmentCount: number;
  unreadAlerts: number;
  buyerConversations: number;
  assignedRfqs: number;
  activeListings: number;
  priceSignals: number;
  completedDeals: number;
  readyDeals: number;
};

const EMPTY_SIGNALS: PreviewSignals = {
  businessName: "My Business",
  profileComplete: false,
  active: true,
  readinessPercent: null,
  activeSegmentCount: 1,
  unreadAlerts: 0,
  buyerConversations: 0,
  assignedRfqs: 0,
  activeListings: 0,
  priceSignals: 0,
  completedDeals: 0,
  readyDeals: 0,
};

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of ["items", "rows", "data", "rfqs", "notifications", "updates", "enquiries"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  return [];
}

function countByStatus(rows: unknown[], accepted: string[]) {
  const normalizedAccepted = accepted.map((value) => value.toLowerCase());

  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const record = row as Record<string, unknown>;
    const status = String(
      record.status ??
        record.stage ??
        record.deal_status ??
        record.workflow_status ??
        "",
    ).toLowerCase();

    return normalizedAccepted.some((value) => status.includes(value));
  }).length;
}

function getNumber(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return Math.max(0, value);
  }

  return null;
}

async function safeJson(url: string) {
  try {
    const response = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default function VendorBusinessOsPreviewPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [signals, setSignals] = useState<PreviewSignals>(EMPTY_SIGNALS);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [rfqPayload, notificationPayload, pricePayload, performancePayload] =
      await Promise.all([
        safeJson("/api/vendor/rfqs"),
        safeJson("/api/vendor/notifications"),
        safeJson("/api/vendor/price-updates"),
        safeJson("/api/vendor/performance"),
      ]);

    const rfqs = asArray(rfqPayload);
    const notifications = asArray(notificationPayload);
    const priceUpdates = asArray(pricePayload);
    const performance =
      performancePayload && typeof performancePayload === "object"
        ? (performancePayload as Record<string, unknown>)
        : {};

    const metadata = user?.user_metadata ?? {};
    const businessName =
      String(
        metadata.business_name ??
          metadata.company_name ??
          metadata.full_name ??
          metadata.name ??
          "",
      ).trim() ||
      user?.email?.split("@")[0] ||
      "My Business";

    const unreadFromPayload =
      getNumber(notificationPayload, ["unreadCount", "unread_count", "count"]) ??
      notifications.filter((item) => {
        if (!item || typeof item !== "object") return false;
        const record = item as Record<string, unknown>;
        return record.read_at == null && record.is_read !== true && record.read !== true;
      }).length;

    const assignedRfqs =
      getNumber(rfqPayload, ["assignedCount", "assigned_count", "count", "total"]) ??
      rfqs.length;

    const buyerConversations =
      getNumber(performance, [
        "buyerConversations",
        "buyer_conversations",
        "openConversations",
        "open_conversations",
        "repliedLeads",
        "replied_leads",
      ]) ?? 0;

    const completedDeals =
      getNumber(performance, [
        "completedDeals",
        "completed_deals",
        "dealsCompleted",
        "deals_completed",
      ]) ?? countByStatus(rfqs, ["complete", "closed", "won"]);

    const readyDeals =
      getNumber(performance, ["readyDeals", "ready_deals", "dealReady", "deal_ready"]) ??
      countByStatus(rfqs, ["ready", "confirmed", "accepted"]);

    const profilePercent =
      getNumber(performance, [
        "profilePercent",
        "profile_percent",
        "profileCompletion",
        "profile_completion",
      ]) ??
      getNumber(metadata, ["profile_percent", "profile_completion"]);

    const activeListings =
      getNumber(performance, ["activeListings", "active_listings", "listingCount"]) ?? 0;

    setSignals({
      businessName,
      profileComplete:
        Boolean(metadata.profile_complete ?? metadata.profile_completed) ||
        (profilePercent !== null && profilePercent >= 100),
      active: String(metadata.account_status ?? metadata.status ?? "active") !== "disabled",
      readinessPercent: profilePercent,
      activeSegmentCount:
        Array.isArray(metadata.vendor_capabilities)
          ? Math.max(1, metadata.vendor_capabilities.length)
          : 1,
      unreadAlerts: unreadFromPayload,
      buyerConversations,
      assignedRfqs,
      activeListings,
      priceSignals:
        getNumber(pricePayload, ["count", "total", "totalUpdates", "total_updates"]) ??
        priceUpdates.length,
      completedDeals,
      readyDeals,
    });

    setRefreshedAt(new Date());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const projection = useMemo(
    () =>
      createVendorBusinessOsProjection({
        ...signals,
        businessSubtitle:
          "Vendor Business Operating System · Live production preview",
      }),
    [signals],
  );

  return (
    <main
      data-vendor-business-os-preview="true"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #ffffff 36%, #f8fafc 100%)",
        padding: "18px 0 34px",
      }}
    >
      <Container>
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
            padding: "12px 14px",
            border: "1px solid #fde68a",
            borderRadius: 16,
            background: "#fffbeb",
          }}
        >
          <div>
            <div
              style={{
                color: "#92400e",
                fontSize: 11,
                fontWeight: 950,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Controlled preview
            </div>
            <div
              style={{
                marginTop: 3,
                color: "#451a03",
                fontSize: 13,
                lineHeight: 1.45,
                fontWeight: 750,
              }}
            >
              This page uses the new Business OS renderer. Your existing Vendor Dashboard remains unchanged.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              style={{
                minHeight: 38,
                padding: "0 13px",
                border: "1px solid #d97706",
                borderRadius: 11,
                background: "#ffffff",
                color: "#92400e",
                fontWeight: 900,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Refreshing…" : "Refresh live data"}
            </button>

            <Link
              href="/dashboard/vendor"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 38,
                padding: "0 13px",
                borderRadius: 11,
                background: "#0f172a",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              Return to current dashboard
            </Link>
          </div>
        </section>

        {refreshedAt ? (
          <div
            style={{
              margin: "0 2px 10px",
              color: "#64748b",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Live signals refreshed at {refreshedAt.toLocaleTimeString()}.
          </div>
        ) : null}

        <BusinessOsRenderer projection={projection} />
      </Container>
    </main>
  );
}

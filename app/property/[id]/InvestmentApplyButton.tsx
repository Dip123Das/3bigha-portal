"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InvestmentApplyButton({
  listingId,
  opportunityId,
  title,
}: {
  listingId: string;
  opportunityId?: string | null;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    if (loading) return;
    setLoading(true);

    try {
      let finalOpportunityId = String(opportunityId || "").trim();

      // Fallback only if direct opportunity id was not passed
      if (!finalOpportunityId) {
        const oppRes = await fetch(
          `/api/investment/opportunities?source_type=property&source_id=${encodeURIComponent(
            listingId
          )}`,
          { method: "GET", cache: "no-store" }
        );

        const oppJson = await oppRes.json().catch(() => null);

        if (!oppRes.ok || !oppJson?.data?.[0]?.id) {
          throw new Error(
            "No property-level investment opportunity found for this listing."
          );
        }

        finalOpportunityId = String(oppJson.data[0].id);
      }

      const appRes = await fetch("/api/investment/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          opportunity_id: finalOpportunityId,
          message: `Investor interested in property: ${title}`,
        }),
      });

      const appJson = await appRes.json().catch(() => null);

      const dealRoomId = String(
        appJson?.deal_room_id ?? appJson?.dealRoomId ?? ""
      ).trim();

      const redirectPath = String(
        appJson?.redirect_path ?? appJson?.redirectPath ?? ""
      ).trim();

      if (!appRes.ok) {
        throw new Error(appJson?.error || "Failed to apply for investment.");
      }

      if (redirectPath) {
        router.push(redirectPath);
        return;
      }

      if (!dealRoomId) {
        throw new Error("Deal room was not created properly.");
      }

      router.push(
        `/dashboard/investor/deal-rooms/${encodeURIComponent(dealRoomId)}`
      );
    } catch (e: any) {
      alert(e?.message || "Investment failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleApply}
      disabled={loading}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 12,
        border: "none",
        background: loading ? "#999" : "#000",
        color: "#fff",
        fontWeight: 800,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Processing..." : "💰 Invest Now"}
    </button>
  );
}
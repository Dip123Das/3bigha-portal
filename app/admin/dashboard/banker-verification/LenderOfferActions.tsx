"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LenderOfferActions({
  offerId,
}: {
  offerId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function updateOffer(action: string) {
    try {
      setSaving(true);

      const response = await fetch(
        `/api/finance/lender-offers/${offerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      const json = await response.json();

      if (!json?.ok) {
        alert(json?.error || "Unable to update lender offer.");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-w-[210px] grid-cols-3 gap-2">
      <button
        type="button"
        disabled={saving}
        onClick={() => updateOffer("approve")}
        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
      >
        Approve
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() => updateOffer("deactivate")}
        className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
      >
        Pause
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={() => updateOffer("reject")}
        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}
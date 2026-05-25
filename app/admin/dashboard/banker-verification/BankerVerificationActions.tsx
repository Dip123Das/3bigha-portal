"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BankerVerificationActions({
  bankerId,
}: {
  bankerId: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function updateStatus(action: string) {
    try {
      setSaving(true);

      const response = await fetch(
        `/api/finance/banker-profile/${bankerId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            notes,
          }),
        }
      );

      const json = await response.json();

      if (!json?.ok) {
        alert(json?.error || "Unable to update banker.");
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
    <div className="min-w-[220px] space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Manual verification notes"
        rows={2}
        className="w-full rounded-xl border px-3 py-2 text-xs"
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => updateStatus("approve")}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          Approve
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => updateStatus("reject")}
          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          Reject
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => updateStatus("clarification")}
          className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          Clarify
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => updateStatus("suspicious")}
          className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          Suspicious
        </button>
      </div>
    </div>
  );
}

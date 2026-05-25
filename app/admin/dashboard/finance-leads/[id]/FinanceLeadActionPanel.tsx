"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { lenderMaster } from "@/lib/finance/lenderMaster";

export default function FinanceLeadActionPanel({
  leadId,
  currentStatus,
  currentLender,
  currentLenderType,
  currentNotes,
}: {
  leadId: string;
  currentStatus?: string | null;
  currentLender?: string | null;
  currentLenderType?: string | null;
  currentNotes?: string | null;
}) {
  const router = useRouter();

  const [status, setStatus] = useState(currentStatus || "new");
  const [assignedLender, setAssignedLender] = useState(currentLender || "");
  const [assignedLenderType, setAssignedLenderType] =
    useState(currentLenderType || "");
  const [adminNotes, setAdminNotes] = useState(currentNotes || "");
  const [saving, setSaving] = useState(false);

  async function saveLead() {
    try {
      setSaving(true);

      const response = await fetch(`/api/finance/loan-leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          assignedLender,
          assignedLenderType,
          adminNotes,
        }),
      });

      const json = await response.json();

      if (!json?.ok) {
        alert(json?.error || "Unable to update lead.");
        return;
      }

      router.refresh();
      alert("Finance lead updated.");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Lead Operations
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Lead Status
          </span>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="new">
              🔵 New Lead
            </option>

            <option value="contacted">
              🟡 Contacted
            </option>

            <option value="documents_pending">
              🟠 Documents Pending
            </option>

            <option value="assigned_to_lender">
              🏦 Assigned to Lender
            </option>

            <option value="under_review">
              🧾 Under Review
            </option>

            <option value="sanction_possible">
              🟢 Sanction Possible
            </option>

            <option value="converted">
              ✅ Converted
            </option>

            <option value="rejected">
              🔴 Rejected
            </option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Assign Lender / Bank / NBFC
          </span>

          <select
            value={assignedLender}
            onChange={(e) => {
              const lender = lenderMaster.find(
                (item) => item.name === e.target.value
              );

              setAssignedLender(e.target.value);

              if (lender?.type) {
                setAssignedLenderType(lender.type);
              }
            }}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">
              Select lender
            </option>

            {lenderMaster.map((lender) => (
              <option
                key={lender.name}
                value={lender.name}
              >
                {lender.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Lender Type
          </span>

          <select
            value={assignedLenderType}
            onChange={(e) => setAssignedLenderType(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Select lender type</option>
            <option value="public_bank">Public Bank</option>
            <option value="private_bank">Private Bank</option>
            <option value="hfc">Housing Finance Company</option>
            <option value="nbfc">NBFC</option>
            <option value="cooperative">Cooperative Bank</option>
            <option value="rrb">Gramin / Regional Rural Bank</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Admin Notes
          </span>

          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Write follow-up notes, borrower condition, document status..."
            className="rounded-xl border px-3 py-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={saveLead}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Update Lead"}
        </button>
      </div>
    </div>
  );
}
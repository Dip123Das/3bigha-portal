"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RegistryLender = {
  id: string;
  lender_name: string;
  lender_type: string;
};

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

  const [assignedLender, setAssignedLender] =
    useState(currentLender || "");

  const [assignedLenderType, setAssignedLenderType] =
    useState(currentLenderType || "");

  const [adminNotes, setAdminNotes] =
    useState(currentNotes || "");

  const [saving, setSaving] = useState(false);

  const [lenders, setLenders] = useState<
    RegistryLender[]
  >([]);

  useEffect(() => {
    let active = true;

    async function loadLenders() {
      try {
        const response = await fetch(
          "/api/finance/lender-registry",
          {
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (!active) return;

        if (json?.ok && Array.isArray(json.lenders)) {
          setLenders(json.lenders);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadLenders();

    return () => {
      active = false;
    };
  }, []);

  async function saveLead() {
    try {
      setSaving(true);

      const response = await fetch(
        `/api/finance/loan-leads/${leadId}`,
        {
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
        }
      );

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
            <option value="new">🔵 New Lead</option>

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
            Assign Verified Lender
          </span>

          <select
            value={assignedLender}
            onChange={(e) => {
              const lender = lenders.find(
                (item) =>
                  item.lender_name === e.target.value
              );

              setAssignedLender(e.target.value);

              if (lender?.lender_type) {
                setAssignedLenderType(
                  lender.lender_type
                );
              }
            }}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">
              Select verified lender
            </option>

            {lenders.map((lender) => (
              <option
                key={lender.id}
                value={lender.lender_name}
              >
                {lender.lender_name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Lender Type
          </span>

          <input
            value={assignedLenderType}
            onChange={(e) =>
              setAssignedLenderType(e.target.value)
            }
            placeholder="bank / nbfc / hfc"
            className="rounded-xl border px-3 py-2 text-sm"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-slate-700">
            Admin Notes
          </span>

          <textarea
            rows={5}
            value={adminNotes}
            onChange={(e) =>
              setAdminNotes(e.target.value)
            }
            placeholder="Internal finance CRM notes"
            className="rounded-xl border px-3 py-3 text-sm"
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={saveLead}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : "Update Finance Lead"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";

const knownBanks = [
  "State Bank of India",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "LIC Housing Finance",
  "Bajaj Housing Finance",
  "West Bengal Gramin Bank",
  "West Bengal State Cooperative Bank",
];

export default function BankerApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    bankName: "",
    newBankName: "",
    newBankType: "bank",
    branchName: "",
    ifscCode: "",
    branchCode: "",
    employeeId: "",
    designation: "",
    officialEmail: "",
    officialMobile: "",
    employeeCardUrl: "",
  });

  function updateField(key: string, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submitApplication() {
    try {
      setSubmitting(true);

      const response = await fetch("/api/finance/banker-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await response.json();

      if (!json?.ok) {
        alert(json?.error || "Unable to submit banker application.");
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    form.fullName.trim() &&
    (form.bankName.trim() || form.newBankName.trim()) &&
    form.branchName.trim() &&
    form.ifscCode.trim() &&
    form.employeeId.trim() &&
    form.designation.trim();

  return (
    <main data-finance-workflow="true" className="min-h-screen bg-slate-50 px-4 py-6">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
            Banker Verification
          </p>

          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Apply as Verified Banker / Lender Officer
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Banker access is available only after verification. Please provide
            bank, branch and employee details carefully. Fake or incomplete
            applications may be rejected.
          </p>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
            <h2 className="text-xl font-black">Application Submitted</h2>
            <p className="mt-2 text-sm leading-6">
              Your banker profile is now pending verification. After manual/AI
              verification, access to banker dashboard may be approved.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <select
                value={form.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              >
                <option value="">Select listed bank / lender</option>
                {knownBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>

              <input
                placeholder="Bank / NBFC not listed? Enter new name"
                value={form.newBankName}
                onChange={(e) => updateField("newBankName", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <select
                value={form.newBankType}
                onChange={(e) => updateField("newBankType", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              >
                <option value="bank">Bank</option>
                <option value="public_bank">Public Bank</option>
                <option value="private_bank">Private Bank</option>
                <option value="hfc">Housing Finance Company</option>
                <option value="nbfc">NBFC</option>
                <option value="cooperative">Cooperative Bank</option>
                <option value="rrb">Gramin / Regional Rural Bank</option>
              </select>

              <input
                placeholder="Branch Name"
                value={form.branchName}
                onChange={(e) => updateField("branchName", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="IFSC Code"
                value={form.ifscCode}
                onChange={(e) => updateField("ifscCode", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm uppercase"
              />

              <input
                placeholder="Branch Code"
                value={form.branchCode}
                onChange={(e) => updateField("branchCode", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="Employee ID / Staff Number"
                value={form.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="Designation"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="Official Email"
                value={form.officialEmail}
                onChange={(e) => updateField("officialEmail", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="Official Mobile"
                value={form.officialMobile}
                onChange={(e) => updateField("officialMobile", e.target.value)}
                className="rounded-2xl border px-4 py-3 text-sm"
              />

              <input
                placeholder="Employee Card URL for now"
                value={form.employeeCardUrl}
                onChange={(e) =>
                  updateField("employeeCardUrl", e.target.value)
                }
                className="rounded-2xl border px-4 py-3 text-sm"
              />
            </div>

            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Employee card upload + AI OCR verification will be added in the
              next phase. For now, paste document URL if available.
            </div>

            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={submitApplication}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit Banker Verification"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
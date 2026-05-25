"use client";

import { useState } from "react";

type Props = {
  lenderName: string;
};

export default function BankerLenderOfferForm({ lenderName }: Props) {
  const [productType, setProductType] = useState("home");
  const [state, setState] = useState("West Bengal");
  const [district, setDistrict] = useState("");
  const [minRoi, setMinRoi] = useState("8.5");
  const [maxRoi, setMaxRoi] = useState("9.5");
  const [processingFee, setProcessingFee] = useState("0.5");
  const [minCibil, setMinCibil] = useState("700");
  const [maxFoir, setMaxFoir] = useState("50");
  const [maxTenure, setMaxTenure] = useState("30");
  const [ltv, setLtv] = useState("80");
  const [termsNote, setTermsNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submitOffer() {
    try {
      setSubmitting(true);
      setSuccess(false);

      const response = await fetch("/api/finance/lender-offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lenderName,
          productType,
          state,
          district,
          minRoi: Number(minRoi),
          maxRoi: Number(maxRoi),
          processingFeePercent: Number(processingFee),
          minCibil: Number(minCibil),
          maxFoirPercent: Number(maxFoir),
          maxTenureYears: Number(maxTenure),
          ltvPercent: Number(ltv),
          termsNote,
        }),
      });

      const json = await response.json();

      if (!json?.ok) {
        alert(json?.error || "Unable to submit lender offer.");
        return;
      }

      setSuccess(true);
      setTermsNote("");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while submitting lender offer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
            Lender Offer Management
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-900">
            Submit Latest Loan Offer
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add ROI, tenure, CIBIL, FOIR and LTV rules for your bank. Admin can
            verify and activate the offer before it appears publicly.
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700">
          {lenderName}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <select
          value={productType}
          onChange={(e) => setProductType(e.target.value)}
          className="rounded-2xl border px-4 py-3 text-sm font-bold"
        >
          <option value="home">Home Loan</option>
          <option value="construction">Construction Loan</option>
          <option value="plot">Plot / Land Loan</option>
        </select>

        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="District optional"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={minCibil}
          onChange={(e) => setMinCibil(e.target.value)}
          placeholder="Minimum CIBIL"
          type="number"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={minRoi}
          onChange={(e) => setMinRoi(e.target.value)}
          placeholder="Min ROI"
          type="number"
          step="0.01"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={maxRoi}
          onChange={(e) => setMaxRoi(e.target.value)}
          placeholder="Max ROI"
          type="number"
          step="0.01"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={processingFee}
          onChange={(e) => setProcessingFee(e.target.value)}
          placeholder="Processing Fee %"
          type="number"
          step="0.01"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={maxFoir}
          onChange={(e) => setMaxFoir(e.target.value)}
          placeholder="Max FOIR %"
          type="number"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={maxTenure}
          onChange={(e) => setMaxTenure(e.target.value)}
          placeholder="Max Tenure Years"
          type="number"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={ltv}
          onChange={(e) => setLtv(e.target.value)}
          placeholder="LTV %"
          type="number"
          className="rounded-2xl border px-4 py-3 text-sm"
        />

        <input
          value={termsNote}
          onChange={(e) => setTermsNote(e.target.value)}
          placeholder="Offer note / terms optional"
          className="rounded-2xl border px-4 py-3 text-sm md:col-span-2"
        />
      </div>

      {success ? (
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Offer submitted. It can be activated after admin verification.
        </div>
      ) : null}

      <button
        type="button"
        onClick={submitOffer}
        disabled={submitting || !lenderName}
        className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit Lender Offer"}
      </button>
    </div>
  );
}
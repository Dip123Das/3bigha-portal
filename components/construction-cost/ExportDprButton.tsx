"use client";

import { useState } from "react";

import { generateConstructionPdf } from "@/lib/construction-cost/pdf-download";

type Props = {
  payload: Record<string, unknown>;
};

export default function ExportDprButton({
  payload,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  async function handleExport() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/construction-cost/export",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const json = await res.json();

      if (!json?.estimate) {
        alert("Export failed");
        return;
      }

      const pdf =
        generateConstructionPdf(
          json.estimate,
        );

      pdf.save(
        `3bigha-construction-dpr-${Date.now()}.pdf`,
      );
    } catch (error) {
      console.error(error);

      alert("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {loading
        ? "Generating PDF..."
        : "Download DPR / BOQ PDF"}
    </button>
  );
}

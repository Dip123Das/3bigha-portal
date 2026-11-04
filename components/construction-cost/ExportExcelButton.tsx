"use client";

import { useState } from "react";
import { generateConstructionCsv } from "@/lib/construction-cost/excel-export";

type Props = {
  payload: Record<string, unknown>;
};

export default function ExportExcelButton({ payload }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    try {
      setLoading(true);

      const res = await fetch("/api/construction-cost/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json?.estimate) {
        alert("CSV export failed");
        return;
      }

      const csv = generateConstructionCsv(json.estimate);
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `3bigha-boq-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error(error);
      alert("CSV export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="rounded-2xl border border-emerald-200 bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
    >
      {loading ? "Generating CSV..." : "Download BOQ CSV"}
    </button>
  );
}

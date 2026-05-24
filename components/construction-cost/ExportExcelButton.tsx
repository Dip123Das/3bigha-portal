"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

import { generateConstructionWorkbook } from "@/lib/construction-cost/excel-export";

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
        alert("Excel export failed");
        return;
      }

      const workbook = generateConstructionWorkbook(json.estimate);

      XLSX.writeFile(workbook, `3bigha-boq-${Date.now()}.xlsx`);
    } catch (error) {
      console.error(error);
      alert("Excel export failed");
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
      {loading ? "Generating Excel..." : "Download BOQ Excel"}
    </button>
  );
}

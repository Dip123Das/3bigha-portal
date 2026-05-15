"use client";

import { useState } from "react";

import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type Props = {
  title?: string;
  city?: string;
  locality?: string;
  pincode?: string;

  builtUpAreaSqFt: number;
  floorCount: number;
  grade: ConstructionGrade;
  roomCount: number;
  bathroomCount: number;
  kitchenCount: number;
  hasInteriorWork: boolean;
  projectStartDate?: string;
};

export default function SaveConstructionProjectButton({
  title,
  city,
  locality,
  pincode,
  builtUpAreaSqFt,
  floorCount,
  grade,
  roomCount,
  bathroomCount,
  kitchenCount,
  hasInteriorWork,
  projectStartDate,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/construction-projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title:
            title ||
            `${builtUpAreaSqFt} sq.ft ${grade} construction project`,
          city,
          locality,
          pincode,
          builtUpAreaSqFt,
          floorCount,
          grade,
          roomCount,
          bathroomCount,
          kitchenCount,
          hasInteriorWork,
          projectStartDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setMessage(result.error || "Failed to save project.");
        return;
      }

      setMessage("Project saved successfully.");
    } catch (error) {
      console.error("Save construction project error:", error);
      setMessage("Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        Save AI Construction Plan
      </p>

      <h2 className="mt-2 text-xl font-black text-slate-950">
        Save this project to your dashboard
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Store this construction estimate, BOQ, material plan, timeline and
        procurement-ready project profile in your 3bigha dashboard.
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-5 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Project"}
      </button>

      {message ? (
        <p className="mt-3 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

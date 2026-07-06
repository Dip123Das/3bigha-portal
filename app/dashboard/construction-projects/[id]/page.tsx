"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import ConstructionCostCalculator from "@/components/construction-cost/ConstructionCostCalculator";
import {
  getSavedConstructionProjectById,
  type SavedConstructionProject,
} from "@/lib/construction-cost/project-storage";

export default function ConstructionProjectDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const [project, setProject] = useState<SavedConstructionProject | null>(null);

  useEffect(() => {
    if (!id) return;
    setProject(getSavedConstructionProjectById(id));
  }, [id]);

  const pageTitle = useMemo(
    () => project?.title ?? "Saved Construction Project",
    [project],
  );

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-black text-slate-950">
              Construction project not found
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              This project may have been deleted or saved in another browser.
            </p>

            <Link
              href="/dashboard/construction-projects"
              className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              Back to Projects
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            Saved AI Construction Project
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {pageTitle}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            {[project.locality, project.city, project.pincode]
              .filter(Boolean)
              .join(", ") || "Location not added"}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/construction-projects"
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-50"
            >
              Back to Projects
            </Link>

            <Link
              href="/rfq/general/new"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              Create RFQ
            </Link>
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <ConstructionCostCalculator />
      </section>
    </main>
  );
}
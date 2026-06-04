"use client";

import OperationalHealthCenter from "@/components/intelligence/OperationalHealthCenter";
import ProjectActivityFeed from "@/components/activity/ProjectActivityFeed";
import SiteExecutionBoard from "@/components/execution/SiteExecutionBoard";
import { useEffect, useState } from "react";
import Link from "next/link";

import SavedConstructionProjectCard from "@/components/construction-cost/SavedConstructionProjectCard";
import {
  deleteSavedConstructionProject,
  getSavedConstructionProjects,
  type SavedConstructionProject,
} from "@/lib/construction-cost/project-storage";

export default function ConstructionProjectsDashboardPage() {
  const [projects, setProjects] = useState<SavedConstructionProject[]>([]);

  function refreshProjects() {
    setProjects(getSavedConstructionProjects());
  }

  useEffect(() => {
    refreshProjects();
  }, []);

  function handleDelete(id: string) {
    deleteSavedConstructionProject(id);
    refreshProjects();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <SiteExecutionBoard />
          <ProjectActivityFeed />
          <OperationalHealthCenter />
        </div>
      </div>
      <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
            AI Construction Workspace
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Saved Construction Projects
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            Save construction plans, budget estimates, BOQ, timeline,
            procurement schedule and RFQ planning in one workspace.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/construction-cost/west-bengal/cooch-behar"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              Create New Plan
            </Link>

            <Link
              href="/rfq/general/new"
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-50"
            >
              Create RFQ
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {projects.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <SavedConstructionProjectCard
                key={project.id}
                project={project}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              No saved construction projects yet
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Start from the AI construction calculator, save your project, and
              return here anytime.
            </p>

            <Link
              href="/construction-cost/west-bengal/cooch-behar"
              className="mt-6 inline-flex rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
            >
              Open Construction Calculator
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
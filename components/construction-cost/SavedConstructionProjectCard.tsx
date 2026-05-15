"use client";

import Link from "next/link";

import type { SavedConstructionProject } from "@/lib/construction-cost/project-storage";

type Props = {
  project: SavedConstructionProject;
  onDelete?: (id: string) => void;
};

export default function SavedConstructionProjectCard({
  project,
  onDelete,
}: Props) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Saved Construction Project
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            {project.title}
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {[project.locality, project.city, project.pincode]
              .filter(Boolean)
              .join(", ") || "Location not added"}
          </p>
        </div>

        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-800">
          {project.grade}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Built-up Area
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {project.builtUpAreaSqFt.toLocaleString("en-IN")} sq.ft
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Floors
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {project.floorCount}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Rooms
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {project.roomCount}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/dashboard/construction-projects/${encodeURIComponent(project.id)}`}
          className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"
        >
          Open Project
        </Link>

        <Link
          href="/construction-cost/west-bengal/cooch-behar"
          className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-50"
        >
          Open Calculator
        </Link>

        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}
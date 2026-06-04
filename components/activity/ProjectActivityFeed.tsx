"use client";

import {
  loadProjectActivities,
  type ProjectActivityItem,
} from "@/lib/activity/projectActivityMemory";

import { useEffect, useState } from "react";

function timeAgo(ts: number) {
  const diff =
    Math.floor((Date.now() - ts) / 1000);

  if (diff < 60) return "just now";

  if (diff < 3600)
    return `${Math.floor(diff / 60)} min ago`;

  if (diff < 86400)
    return `${Math.floor(diff / 3600)} hr ago`;

  return `${Math.floor(diff / 86400)} day ago`;
}

export default function ProjectActivityFeed() {
  const [items, setItems] = useState<
    ProjectActivityItem[]
  >([]);

  useEffect(() => {
    setItems(loadProjectActivities());
  }, []);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Operational Collaboration
          </div>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            Project Activity Feed
          </h3>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          Live Timeline
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No project activity yet.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {item.title}
                  </div>

                  {item.description ? (
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      {item.description}
                    </div>
                  ) : null}
                </div>

                <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                  {timeAgo(item.createdAt)}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <span>{item.type}</span>

                {item.actor ? (
                  <>
                    <span>•</span>
                    <span>{item.actor}</span>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        Human-readable operational collaboration continuity.
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

type Props = {
  title?: string;
  preview?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
};

export default function ExecutiveIntelligenceCollapse({
  title = "Executive Intelligence",
  preview,
  children,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="proc-shell-muted proc-shell-section">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            {title}
          </div>

          {preview ? (
            <p className="mt-1 text-sm font-semibold text-slate-700 proc-shell-tight">
              {preview}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          {expanded ? "Hide" : "Expand"}
        </button>
      </div>

      {expanded ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

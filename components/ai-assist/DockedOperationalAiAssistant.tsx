import type { ReactNode } from "react";

export default function DockedOperationalAiAssistant({
  title = "AI help",
  summary,
  children,
  defaultOpen = false,
}: {
  title?: string;
  summary: string;
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <aside className="rounded-[1.5rem] border border-slate-200 bg-white/95 p-3 shadow-sm">
      <details open={defaultOpen}>
        <summary className="cursor-pointer list-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                ✨ Assistant
              </div>
              <div className="mt-1 text-sm font-black text-slate-950">
                {title}
              </div>
              <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                {summary}
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-600">
              Details
            </span>
          </div>
        </summary>

        {children ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {children}
          </div>
        ) : null}
      </details>
    </aside>
  );
}

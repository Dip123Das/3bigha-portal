import Link from "next/link";
import type { ReactNode } from "react";

type Action = {
  label: string;
  href: string;
  tone?: "primary" | "success" | "warning" | "neutral";
};

function actionClass(tone?: Action["tone"]) {
  if (tone === "success") return "bg-emerald-600 text-white border-emerald-600";
  if (tone === "warning") return "bg-amber-500 text-white border-amber-500";
  if (tone === "neutral") return "bg-white text-slate-800 border-slate-200";
  return "bg-slate-950 text-white border-slate-950";
}

export default function OperationalWorkspacePanel({
  title = "What should I do now?",
  nextAction,
  status,
  actions,
  children,
}: {
  title?: string;
  nextAction: string;
  status?: string;
  actions: Action[];
  children?: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            Work Space
          </div>
          <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            Next step: {nextAction}
          </div>
        </div>

        {status ? (
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            {status}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Link
            key={`${action.label}-${action.href}`}
            href={action.href}
            className={`inline-flex rounded-full border px-4 py-2 text-sm font-black transition hover:opacity-90 ${actionClass(action.tone)}`}
          >
            {action.label}
          </Link>
        ))}
      </div>

      {children ? (
        <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-4 py-3 text-sm font-black text-slate-800">
            Show AI help and advanced details
          </summary>
          <div className="space-y-3 px-3 pb-3">{children}</div>
        </details>
      ) : null}
    </section>
  );
}
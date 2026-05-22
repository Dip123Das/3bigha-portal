import Link from "next/link";

type Step = {
  label: string;
  active?: boolean;
  done?: boolean;
};

type Action = {
  label: string;
  href: string;
  primary?: boolean;
};

export default function UniversalWorkflowHeader({
  eyebrow = "Workflow",
  title,
  status,
  nextAction,
  steps,
  actions,
}: {
  eyebrow?: string;
  title: string;
  status: string;
  nextAction: string;
  steps: Step[];
  actions: Action[];
}) {
  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            {eyebrow}
          </div>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            {title}
          </h2>

          <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
            What is happening: {status}
          </div>

          <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
            What to do next: {nextAction}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {actions.map((action) => (
            <Link
              key={`${action.label}-${action.href}`}
              href={action.href}
              className={
                action.primary
                  ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
                  : "rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <div
            key={`${step.label}-${index}`}
            className={
              step.active
                ? "whitespace-nowrap rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-black text-white"
                : step.done
                  ? "whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700"
                  : "whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500"
            }
          >
            {step.done ? "✓ " : ""}
            {step.label}
          </div>
        ))}
      </div>
    </section>
  );
}
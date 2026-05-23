import Link from "next/link";
import type { WorkflowPredictionInput } from "@/lib/predictive-operational-intelligence/predictive-types";
import { buildPredictiveOperationalSummary } from "@/lib/predictive-operational-intelligence/build-predictive-summary";

export default function PredictiveOperationalInsights({
  input,
  title = "Predictive Operational Insights",
}: {
  input?: WorkflowPredictionInput;
  title?: string;
}) {
  const summary = buildPredictiveOperationalSummary(input);

  const calmMessage =
    summary.signals.length === 0
      ? "Operations look calm. No immediate coordination pressure detected."
      : "Early workflow signals are visible. Review calmly before pressure increases.";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contextual AI Assistance
          </p>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{calmMessage}</p>
        </div>

        <div className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 sm:mt-0">
          Score {summary.overallScore}/100
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {summary.signals.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Continue normal workflow. AI will stay in the background and support only when useful.
          </div>
        ) : (
          summary.signals.slice(0, 3).map((signal) => (
            <div
              key={signal.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{signal.message}</p>
                </div>

                {signal.href && signal.actionLabel ? (
                  <Link
                    href={signal.href}
                    className="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    {signal.actionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

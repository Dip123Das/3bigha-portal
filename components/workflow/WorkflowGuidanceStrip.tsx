import Link from "next/link";

import { buildWorkflowGuidance } from "@/lib/workflow-guidance/build-guidance";
import type { WorkflowGuidanceInput } from "@/lib/workflow-guidance/types";

function getStyles(severity: string) {
  switch (severity) {
    case "priority":
      return "border-amber-200 bg-amber-50 text-amber-900";

    case "watch":
      return "border-orange-200 bg-orange-50 text-orange-900";

    case "attention":
      return "border-sky-200 bg-sky-50 text-sky-900";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function WorkflowGuidanceStrip({
  input,
}: {
  input?: WorkflowGuidanceInput;
}) {
  const guidance = buildWorkflowGuidance(input);

  const item = guidance[0];

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${getStyles(
        item.severity
      )}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-sm">📌</div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Suggested Attention
          </p>

          <p className="text-sm font-medium leading-relaxed">
            {item.message}
          </p>
        </div>
      </div>

      {item.href && item.actionLabel ? (
        <Link
          href={item.href}
          className="inline-flex w-fit items-center rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          {item.actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

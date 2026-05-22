import Link from "next/link";

export default function StickyWorkflowCommandBar({
  stage,
  risk,
  nextAction,
  primaryLabel,
  primaryHref,
  secondaryHref,
  secondaryLabel = "Inbox",
}: {
  stage: string;
  risk: string;
  nextAction: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="sticky top-2 z-50 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:top-20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Stage: {stage}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              Risk: {risk}
            </span>
          </div>

          <div className="mt-2 truncate text-sm font-black text-slate-900">
            Next: {nextAction}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={primaryHref}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
          >
            {primaryLabel}
          </Link>

          {secondaryHref ? (
            <Link
              href={secondaryHref}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
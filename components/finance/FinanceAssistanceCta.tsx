import Link from "next/link";

export default function FinanceAssistanceCta({
  title = "Need banking or finance assistance?",
  description = "Check EMI, loan eligibility, construction finance and verified banker support before taking the next step.",
  budget,
  source = "finance-cta",
}: {
  title?: string;
  description?: string;
  budget?: number | string | null;
  source?: string;
}) {
  const params = new URLSearchParams();

  if (budget) params.set("budget", String(budget));
  params.set("source", source);

  const emiHref = `/emi-calculator?${params.toString()}`;

  return (
    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-blue-600">
        Banking Finance Assistance
      </p>

      <h2 className="mt-2 text-xl font-black text-slate-900">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={emiHref}
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
        >
          Check EMI & Eligibility
        </Link>

        <Link
          href="/banking-finance-assistance"
          className="rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-black text-blue-700 hover:bg-blue-50"
        >
          Finance Assistance
        </Link>
      </div>
    </div>
  );
}
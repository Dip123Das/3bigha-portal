import Link from "next/link";
import ProcurementCopilotClient from "./ProcurementCopilotClient";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";

export const dynamic = "force-dynamic";

export default function ProcurementCopilotPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em]">
          AI Procurement Copilot
        </div>

        <h1 className="mt-4 text-3xl font-black">
          Ask Your Procurement Brain
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-200">
          Ask what needs attention, which RFQs may close, which vendors look risky,
          or what the next procurement action should be.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard/procurement-control-tower"
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950"
          >
            Operations Desk
          </Link>

          <Link
            href="/dashboard/procurement-analytics"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white"
          >
            Analytics
          </Link>

          <Link
            href="/dashboard/inbox-v2"
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black text-white"
          >
            Inbox Work Desk
          </Link>
        </div>
      </div>

      <ProcurementCommandCenterNav />

      <ProcurementCopilotClient />
    </div>
  );
}
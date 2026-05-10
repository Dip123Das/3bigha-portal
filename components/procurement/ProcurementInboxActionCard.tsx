// components/procurement/ProcurementInboxActionCard.tsx

"use client";

type Props = {
  item: {
    thread: string;
    urgency: string;
    aiAction: string;
    reason: string;
    confidence: number;
  };
};

export default function ProcurementInboxActionCard({
  item,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.thread}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            {item.reason}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.urgency}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
          Recommended AI Action
        </div>

        <div className="mt-3 text-lg font-black text-violet-950">
          {item.aiAction}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-600">
          <span>AI Confidence</span>
          <span>{item.confidence}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-950"
            style={{
              width: `${item.confidence}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
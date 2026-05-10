"use client";

type Props = {
  item: {
    title: string;
    workflow: string;
    type: string;
    priority: string;
    target: string;
    suggestedMessage: string;
    reason: string;
    confidence: number;
    status: string;
  };
};

export default function AutonomousTaskCard({ item }: Props) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-black text-slate-950">
            {item.title}
          </div>

          <div className="mt-2 text-sm font-semibold text-slate-500">
            {item.workflow} • {item.type} • target: {item.target}
          </div>
        </div>

        <div className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {item.priority}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-blue-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
          Why AI recommends this
        </div>

        <div className="mt-3 text-sm font-bold text-blue-950">
          {item.reason}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-violet-50 p-5">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
          Suggested execution message
        </div>

        <div className="mt-3 text-sm font-bold leading-6 text-violet-950">
          {item.suggestedMessage}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Confidence
          </div>
          <div className="mt-1 text-2xl font-black text-slate-950">
            {item.confidence}%
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(item.suggestedMessage);
          }}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Copy AI Message
        </button>
      </div>
    </div>
  );
}
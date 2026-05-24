"use client";

type VisualSignal = {
  key: string;
  label: string;
  confidence: number;
  note: string;
};

type Props = {
  signals?: VisualSignal[];
};

export default function DrawingEntityOverlay({
  signals = [],
}: Props) {
  if (!signals.length) return null;

  return (
    <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
        Visual Drawing Signals
      </div>

      <div className="mt-1 text-lg font-black text-slate-950">
        AI-detected drawing hints
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signals.map((signal) => (
          <div
            key={signal.key}
            className="rounded-2xl bg-white p-4"
          >
            <div className="text-sm font-black text-slate-950">
              {signal.label}
            </div>

            <div className="mt-2 text-xs font-bold text-blue-700">
              Confidence: {signal.confidence}%
            </div>

            <div className="mt-2 text-xs font-semibold leading-5 text-slate-600">
              {signal.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

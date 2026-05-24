"use client";

type Props = {
  extractedText?: string;
  detectedKeywords?: string[];
  confidence?: number;
  notes?: string[];
};

export default function DrawingOcrInsightsPanel({
  extractedText,
  detectedKeywords = [],
  confidence = 0,
  notes = [],
}: Props) {
  return (
    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            AI OCR Insights
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            Drawing extraction visibility
          </div>
        </div>

        <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">
          {confidence}% confidence
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Extracted OCR Text
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
            {extractedText || "No OCR text extracted yet."}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Detected Engineering Labels
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {detectedKeywords.length ? (
              detectedKeywords.map((keyword) => (
                <div
                  key={keyword}
                  className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-800"
                >
                  {keyword}
                </div>
              ))
            ) : (
              <div className="text-sm font-semibold text-slate-500">
                No engineering labels detected yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {notes.length ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            AI Extraction Notes
          </div>

          <div className="mt-3 space-y-2">
            {notes.map((note) => (
              <div
                key={note}
                className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700"
              >
                • {note}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

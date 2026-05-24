"use client";

type Props = {
  fileName: string;
  previewUrl?: string;
  drawingType: string;
  uploading?: boolean;
};

export default function DrawingPreviewCard({
  fileName,
  previewUrl,
  drawingType,
  uploading = false,
}: Props) {
  if (!fileName) return null;

  return (
    <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            Drawing Preview
          </div>

          <div className="mt-1 text-sm font-black text-slate-950">
            {fileName}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-500">
            Type: {drawingType.replace("_", " ")}
          </div>
        </div>

        <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
          {uploading ? "Analyzing" : "Ready"}
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img
            src={previewUrl}
            alt="Uploaded construction drawing preview"
            className="max-h-80 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-bold text-slate-600">
          Preview will appear for image drawings. PDF/DWG/DXF analysis is accepted without preview.
        </div>
      )}
    </div>
  );
}

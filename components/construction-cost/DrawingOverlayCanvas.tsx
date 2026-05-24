"use client";

import {
  generateDynamicDrawingOverlays,
} from "@/lib/construction-cost/drawing-overlay-engine";

type Props = {
  previewUrl?: string;

  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  staircases?: number;
  lifts?: number;
  parkingAreas?: number;
};

export default function DrawingOverlayCanvas({
  previewUrl,
  bedrooms,
  bathrooms,
  kitchens,
  staircases,
  lifts,
  parkingAreas,
}: Props) {
  if (!previewUrl) return null;

  const overlays =
    generateDynamicDrawingOverlays({
      bedrooms,
      bathrooms,
      kitchens,
      staircases,
      lifts,
      parkingAreas,
    });

  return (
    <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            AI Overlay Mapping
          </div>

          <div className="mt-1 text-lg font-black text-slate-950">
            Dynamic room/entity visualization
          </div>
        </div>

        <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-800">
          AI Active
        </div>
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        <img
          src={previewUrl}
          alt="Construction drawing overlay"
          className="w-full object-contain"
        />

        {overlays.map((item) => (
          <div
            key={item.id}
            className="absolute rounded-xl border-2 transition-all"
            style={{
              top: `${item.top}%`,
              left: `${item.left}%`,
              width: `${item.width}%`,
              height: `${item.height}%`,
              borderColor: item.color,
              background: `${item.color}20`,
            }}
          >
            <div
              className="inline-flex rounded-br-lg px-2 py-1 text-[10px] font-black text-white"
              style={{
                background: item.color,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs font-semibold leading-5 text-slate-600">
        Overlay positions are currently AI-assisted approximations. Future
        versions will support actual coordinate-based room detection from PDFs
        and scanned engineering drawings.
      </div>
    </div>
  );
}

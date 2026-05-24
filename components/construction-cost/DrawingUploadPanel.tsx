"use client";

import { useMemo, useState } from "react";

import {
  analyzeConstructionDrawing,
} from "@/lib/construction-cost/drawing-analysis-engine";
import type { DrawingAnalysisResult } from "@/lib/construction-cost/drawing-types";
import DrawingPreviewCard from "@/components/construction-cost/DrawingPreviewCard";
import DrawingEntityOverlay from "@/components/construction-cost/DrawingEntityOverlay";

import DrawingRoomBadge from "@/components/construction-cost/DrawingRoomBadge";
import DrawingDetectionLegend from "@/components/construction-cost/DrawingDetectionLegend";
import DrawingOverlayCanvas from "@/components/construction-cost/DrawingOverlayCanvas";
import GenerateDrawingBoqButton from "@/components/construction-cost/GenerateDrawingBoqButton";
import DrawingOcrInsightsPanel from "@/components/construction-cost/DrawingOcrInsightsPanel";
import DrawingProcurementPackagePanel from "@/components/construction-cost/DrawingProcurementPackagePanel";
import ProcurementExecutionTimeline from "@/components/construction-cost/ProcurementExecutionTimeline";


type Props = {
  builtUpAreaSqFt: number;
  floorCount: number;
  basementCount?: number;
};

export default function DrawingUploadPanel({
  builtUpAreaSqFt,
  floorCount,
  basementCount = 0,
}: Props) {
  const fallbackAnalysis = useMemo(
    () =>
      analyzeConstructionDrawing({
        drawingType: "floor_plan",
        builtUpAreaSqFt,
        floorCount,
        basementCount,
      }),
    [builtUpAreaSqFt, floorCount, basementCount],
  );

  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [drawingType, setDrawingType] = useState<
    "floor_plan" | "structural" | "elevation"
  >("floor_plan");

  const [analysis, setAnalysis] =
    useState<DrawingAnalysisResult | null>(null);

  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [visualSignals, setVisualSignals] = useState<
    Array<{
      key: string;
      label: string;
      confidence: number;
      note: string;
    }>
  >([]);

  const [ocrInsights, setOcrInsights] = useState<{
    extractedText?: string;
    detectedKeywords?: string[];
    confidence?: number;
    notes?: string[];
  }>({});

  const activeAnalysis = analysis || fallbackAnalysis;

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setFileName(file.name);
    setMessage("");

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl("");
    }

    try {
      const formData = new FormData();
      formData.append("drawing", file);
      formData.append("drawingType", drawingType);
      formData.append("builtUpAreaSqFt", String(builtUpAreaSqFt));
      formData.append("floorCount", String(floorCount));
      formData.append("basementCount", String(basementCount));

      const res = await fetch("/api/construction-drawing/analyze", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Drawing analysis failed.");
      }

      setAnalysis(json.analysis);

      setVisualSignals(json.visualSignals || []);

      setOcrInsights({
        extractedText: json?.ocr?.extractedText,
        detectedKeywords: json?.ocr?.detectedKeywords || [],
        confidence: json?.ocr?.confidence || 0,
        notes: json?.ocr?.notes || [],
      });

      setMessage("Drawing accepted. Preliminary AI quantity analysis updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Drawing analysis failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
            AI Drawing Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Upload drawing for preliminary BOQ intelligence
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Upload a PDF, image, DWG or DXF drawing. The current version gives
            safe preliminary quantity-surveyor guidance. Exact CAD/PDF extraction
            will be connected later.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-black uppercase text-slate-500">
            AI Confidence
          </p>

          <p className="mt-1 text-xl font-black text-violet-700">
            {activeAnalysis.aiConfidenceScore}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setDrawingType("floor_plan")}
          className={`rounded-2xl border p-4 text-left transition ${
            drawingType === "floor_plan"
              ? "border-violet-500 bg-violet-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="text-lg font-black text-slate-950">
            Floor Plan
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600">
            Room layout, apartment, residential plan
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDrawingType("structural")}
          className={`rounded-2xl border p-4 text-left transition ${
            drawingType === "structural"
              ? "border-violet-500 bg-violet-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="text-lg font-black text-slate-950">
            Structural
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600">
            RCC, footing, column, beam drawings
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDrawingType("elevation")}
          className={`rounded-2xl border p-4 text-left transition ${
            drawingType === "elevation"
              ? "border-violet-500 bg-violet-100"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="text-lg font-black text-slate-950">
            Elevation
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600">
            Front elevation and façade drawings
          </div>
        </button>
      </div>

      <label className="mt-5 block cursor-pointer rounded-2xl border-2 border-dashed border-violet-300 bg-white p-6 text-center hover:bg-violet-50">
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="text-5xl">📐</div>

        <div className="mt-3 text-lg font-black text-slate-950">
          {uploading ? "Analyzing drawing..." : "Upload construction drawing"}
        </div>

        <div className="mt-2 text-sm font-semibold text-slate-600">
          PDF • Floor Plan • Image • DWG • DXF
        </div>

        {fileName ? (
          <div className="mt-3 text-xs font-black text-violet-700">
            {fileName}
          </div>
        ) : null}
      </label>

      <DrawingPreviewCard
        fileName={fileName}
        previewUrl={previewUrl}
        drawingType={drawingType}
        uploading={uploading}
      />

      <DrawingEntityOverlay signals={visualSignals} />

      <DrawingOverlayCanvas
        previewUrl={previewUrl}
        bedrooms={activeAnalysis.estimatedRooms}
        bathrooms={activeAnalysis.estimatedBathrooms}
        kitchens={activeAnalysis.estimatedKitchenCount}
        staircases={activeAnalysis.estimatedStaircaseCount}
        lifts={activeAnalysis.estimatedLiftCount}
        parkingAreas={activeAnalysis.estimatedParkingAreaSqFt > 0 ? 1 : 0}
      />

      <DrawingDetectionLegend />

      <DrawingOcrInsightsPanel
        extractedText={ocrInsights.extractedText}
        detectedKeywords={ocrInsights.detectedKeywords}
        confidence={ocrInsights.confidence}
        notes={ocrInsights.notes}
      />

      <GenerateDrawingBoqButton
        builtUpAreaSqFt={builtUpAreaSqFt}
        floorCount={floorCount}
        drawingType={drawingType}
        estimatedRooms={activeAnalysis.estimatedRooms}
        estimatedBathrooms={activeAnalysis.estimatedBathrooms}
        estimatedKitchenCount={activeAnalysis.estimatedKitchenCount}
      />

      <DrawingProcurementPackagePanel
        builtUpAreaSqFt={builtUpAreaSqFt}
        floorCount={floorCount}
        drawingType={drawingType}
        estimatedRooms={activeAnalysis.estimatedRooms}
        estimatedBathrooms={activeAnalysis.estimatedBathrooms}
        estimatedKitchenCount={activeAnalysis.estimatedKitchenCount}
      />

      <ProcurementExecutionTimeline
        builtUpAreaSqFt={builtUpAreaSqFt}
        floorCount={floorCount}
        estimatedRooms={activeAnalysis.estimatedRooms}
        estimatedBathrooms={activeAnalysis.estimatedBathrooms}
        estimatedKitchenCount={activeAnalysis.estimatedKitchenCount}
      />

      {message ? (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold text-violet-800">
          {message}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Estimated Rooms
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {activeAnalysis.estimatedRooms}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Bathrooms
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {activeAnalysis.estimatedBathrooms}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Lift Count
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {activeAnalysis.estimatedLiftCount}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Wall Length
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {activeAnalysis.estimatedWallLengthRft} rft
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
              AI Detection Status
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              Preliminary quantity-surveyor extraction active
            </div>
          </div>

          <div className="rounded-2xl bg-violet-100 px-4 py-2 text-sm font-black text-violet-800">
            {activeAnalysis.aiConfidenceScore}% confidence
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">
              Drawing Type
            </div>

            <div className="mt-2 text-lg font-black text-slate-950">
              {drawingType === "floor_plan"
                ? "Floor Plan"
                : drawingType === "structural"
                ? "Structural"
                : "Elevation"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">
              Procurement Ready
            </div>

            <div className="mt-2 text-lg font-black text-emerald-700">
              Yes
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">
              BOQ Intelligence
            </div>

            <div className="mt-2 text-lg font-black text-blue-700">
              Active
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black uppercase text-slate-500">
              RFQ Automation
            </div>

            <div className="mt-2 text-lg font-black text-orange-700">
              Ready
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Balcony Area
          </div>
          <div className="mt-2 text-xl font-black text-slate-950">
            {activeAnalysis.estimatedBalconyAreaSqFt} sq.ft
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <div className="text-xs font-black uppercase text-slate-500">
            Parking Area
          </div>
          <div className="mt-2 text-xl font-black text-slate-950">
            {activeAnalysis.estimatedParkingAreaSqFt} sq.ft
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="text-sm font-black text-slate-950">
          Engineering Notes
        </div>

        <ul className="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
          {activeAnalysis.engineeringNotes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

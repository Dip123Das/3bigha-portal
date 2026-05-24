export type DrawingVisualSignal = {
  key: string;
  label: string;
  confidence: number;
  note: string;
};

export type DrawingVisualSignalInput = {
  fileName: string;
  fileType: string;
  drawingType: "floor_plan" | "elevation" | "structural" | "electrical" | "plumbing";
};

export function detectDrawingVisualSignals(
  input: DrawingVisualSignalInput,
): DrawingVisualSignal[] {
  const name = input.fileName.toLowerCase();
  const signals: DrawingVisualSignal[] = [];

  if (input.drawingType === "floor_plan") {
    signals.push({
      key: "room_layout",
      label: "Room layout expected",
      confidence: 82,
      note: "Floor plans normally contain bedrooms, toilets, kitchens, living rooms and circulation spaces.",
    });
  }

  if (input.drawingType === "structural") {
    signals.push({
      key: "rcc_structure",
      label: "RCC structure expected",
      confidence: 80,
      note: "Structural drawings normally contain footing, column, beam, slab and reinforcement details.",
    });
  }

  if (input.drawingType === "elevation") {
    signals.push({
      key: "facade",
      label: "Elevation / façade expected",
      confidence: 76,
      note: "Elevation drawings help estimate façade, plaster, paint, windows and exterior finishing.",
    });
  }

  if (name.includes("bed") || name.includes("room")) {
    signals.push({
      key: "rooms",
      label: "Room labels likely",
      confidence: 72,
      note: "Filename indicates possible room labels.",
    });
  }

  if (name.includes("toilet") || name.includes("bath") || name.includes("wc")) {
    signals.push({
      key: "sanitary",
      label: "Sanitary spaces likely",
      confidence: 74,
      note: "Filename indicates bathroom/toilet planning.",
    });
  }

  if (name.includes("stair") || name.includes("lift")) {
    signals.push({
      key: "vertical_core",
      label: "Vertical core likely",
      confidence: 78,
      note: "Filename indicates staircase or lift-core planning.",
    });
  }

  if (input.fileType.includes("image")) {
    signals.push({
      key: "image_ready",
      label: "Image preview ready",
      confidence: 88,
      note: "This drawing can be previewed directly in the browser.",
    });
  }

  if (input.fileType.includes("pdf")) {
    signals.push({
      key: "pdf_ready",
      label: "PDF drawing accepted",
      confidence: 70,
      note: "PDF is accepted. Visual page extraction can be added later.",
    });
  }

  return signals.slice(0, 6);
}

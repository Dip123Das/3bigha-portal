export type DrawingOverlayItem = {
  id: string;
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
  color: string;
};

export type DrawingOverlayInput = {
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  staircases?: number;
  lifts?: number;
  parkingAreas?: number;
};

function pushBoxes(
  items: DrawingOverlayItem[],
  count: number,
  label: string,
  color: string,
  startTop: number,
  startLeft: number,
) {
  for (let i = 0; i < count; i++) {
    items.push({
      id: `${label}-${i}`,
      label,
      top: startTop + i * 8,
      left: startLeft + (i % 2) * 18,
      width: 16,
      height: 12,
      color,
    });
  }
}

export function generateDynamicDrawingOverlays(
  input: DrawingOverlayInput,
) {
  const overlays: DrawingOverlayItem[] = [];

  pushBoxes(
    overlays,
    Math.min(input.bedrooms || 0, 6),
    "Bedroom",
    "#2563eb",
    12,
    10,
  );

  pushBoxes(
    overlays,
    Math.min(input.bathrooms || 0, 5),
    "Bathroom",
    "#059669",
    20,
    48,
  );

  pushBoxes(
    overlays,
    Math.min(input.kitchens || 0, 3),
    "Kitchen",
    "#ea580c",
    48,
    12,
  );

  pushBoxes(
    overlays,
    Math.min(input.staircases || 0, 2),
    "Staircase",
    "#7c3aed",
    52,
    58,
  );

  pushBoxes(
    overlays,
    Math.min(input.lifts || 0, 2),
    "Lift",
    "#e11d48",
    28,
    68,
  );

  pushBoxes(
    overlays,
    Math.min(input.parkingAreas || 0, 4),
    "Parking",
    "#111827",
    74,
    8,
  );

  return overlays;
}

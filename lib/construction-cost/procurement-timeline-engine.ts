export type ProcurementTimelineStage = {
  key: string;
  title: string;
  phase: string;
  materials: string[];
  dependency: string;
  urgency: "high" | "medium" | "low";
  rfqReady: boolean;
  estimatedWindow: string;
  dependsOn: string[];
  blocks: string[];
  progressWeight: number;
};

export function generateProcurementTimeline(): ProcurementTimelineStage[] {
  return [
    {
      key: "structure",
      title: "Structural Procurement",
      phase: "Start first",
      materials: ["Cement", "TMT Steel", "Sand", "Stone Chips"],
      dependency: "Foundation, RCC, column, beam and slab work",
      urgency: "high",
      rfqReady: true,
      estimatedWindow: "Before excavation / foundation",
      dependsOn: [],
      blocks: ["masonry", "plumbing", "electrical", "finishing"],
      progressWeight: 35,
    },
    {
      key: "masonry",
      title: "Masonry Procurement",
      phase: "After RCC base",
      materials: ["Bricks", "Blocks", "Cement", "Sand"],
      dependency: "Walling begins after structural base and slab progress",
      urgency: "medium",
      rfqReady: true,
      estimatedWindow: "After structure reaches working level",
      dependsOn: ["structure"],
      blocks: ["plumbing", "electrical", "finishing"],
      progressWeight: 25,
    },
    {
      key: "plumbing",
      title: "Plumbing Procurement",
      phase: "Before plaster",
      materials: ["Pipes", "Fittings", "Sanitary lines", "Water tank"],
      dependency: "Must start before plaster and bathroom finishing",
      urgency: "medium",
      rfqReady: true,
      estimatedWindow: "Before internal plaster",
      dependsOn: ["masonry"],
      blocks: ["finishing"],
      progressWeight: 15,
    },
    {
      key: "electrical",
      title: "Electrical Procurement",
      phase: "Before plaster",
      materials: ["Wires", "Conduits", "Switch boxes", "DB box"],
      dependency: "Concealed wiring must happen before plaster",
      urgency: "medium",
      rfqReady: true,
      estimatedWindow: "Before plaster and putty",
      dependsOn: ["masonry"],
      blocks: ["finishing"],
      progressWeight: 15,
    },
    {
      key: "finishing",
      title: "Finishing Procurement",
      phase: "After civil completion",
      materials: ["Tiles", "Paint", "Putty", "Primer"],
      dependency: "Should follow wet work and layout finalization",
      urgency: "low",
      rfqReady: true,
      estimatedWindow: "After plaster curing",
      dependsOn: ["plumbing", "electrical"],
      blocks: [],
      progressWeight: 10,
    },
  ];
}
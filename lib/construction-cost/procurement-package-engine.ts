export type ProcurementPackageItem = {
  key: string;
  title: string;
  vendorCategory: string;
  materials: string[];
  priority: "high" | "medium" | "low";
  rfqReady: boolean;
  note: string;
};

export type ProcurementPackageInput = {
  builtUpAreaSqFt: number;
  floorCount: number;
  estimatedRooms: number;
  estimatedBathrooms: number;
  estimatedKitchenCount: number;
  drawingType: string;
};

export function generateProcurementPackages(
  input: ProcurementPackageInput,
): ProcurementPackageItem[] {
  const totalArea =
    input.builtUpAreaSqFt * Math.max(1, input.floorCount);

  return [
    {
      key: "cement_concrete",
      title: "Cement & Concrete Package",
      vendorCategory: "Cement / RMC / Aggregate Supplier",
      materials: ["Cement", "Sand", "Stone Chips", "RMC / Concrete"],
      priority: "high",
      rfqReady: true,
      note: `Core structural procurement for approx ${totalArea.toLocaleString("en-IN")} sq.ft construction.`,
    },
    {
      key: "steel_rcc",
      title: "TMT Steel & RCC Package",
      vendorCategory: "TMT Steel / Reinforcement Supplier",
      materials: ["TMT Bar", "Binding Wire", "RCC Labour Support"],
      priority: "high",
      rfqReady: true,
      note: "High-priority package because RCC and steel affect structure, cost and schedule.",
    },
    {
      key: "masonry",
      title: "Brick / Block Masonry Package",
      vendorCategory: "Brick / Block Supplier",
      materials: ["Bricks", "AAC Blocks", "Mortar Materials"],
      priority: "medium",
      rfqReady: true,
      note: `Room layout indicates approx ${input.estimatedRooms} room zones requiring walling materials.`,
    },
    {
      key: "sanitary_plumbing",
      title: "Sanitary & Plumbing Package",
      vendorCategory: "Plumbing / Sanitary Vendor",
      materials: ["CPVC/PVC Pipes", "Fittings", "Sanitaryware", "Water Tank"],
      priority: input.estimatedBathrooms > 2 ? "high" : "medium",
      rfqReady: true,
      note: `Detected/estimated ${input.estimatedBathrooms} bathroom zones and ${input.estimatedKitchenCount} kitchen zone(s).`,
    },
    {
      key: "electrical",
      title: "Electrical Package",
      vendorCategory: "Electrical Contractor / Material Supplier",
      materials: ["Wires", "Switches", "DB Box", "MCB", "Conduits"],
      priority: "medium",
      rfqReady: true,
      note: "Electrical points can be estimated from room count and final layout.",
    },
    {
      key: "flooring_finishing",
      title: "Flooring & Finishing Package",
      vendorCategory: "Tiles / Paint / Finishing Vendor",
      materials: ["Floor Tiles", "Wall Tiles", "Paint", "Putty", "Primer"],
      priority: "low",
      rfqReady: true,
      note: "Finishing procurement should follow civil progress and room-wise layout finalization.",
    },
  ];
}

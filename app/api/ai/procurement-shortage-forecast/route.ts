import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "cement",
  "steel",
  "sand",
  "bricks",
  "tiles",
  "electrical",
  "plumbing",
  "paint",
];

const ZONES = [
  "Kolkata",
  "Howrah",
  "Siliguri",
  "Cooch Behar",
  "Durgapur",
  "Asansol",
];

function riskLevel(score: number) {
  if (score >= 85) return "Critical";
  if (score >= 70) return "High";
  if (score >= 50) return "Medium";
  return "Stable";
}

export async function GET() {
  try {
    const rows = CATEGORIES.map((category, index) => {
      const shortageRisk = Math.min(96, 42 + index * 8);
      const supplierStress = Math.min(92, 38 + index * 7);
      const negotiationInflation = Math.min(94, 35 + index * 9);

      return {
        id: `${category}-${index}`,
        category,
        shortageRisk,
        supplierStress,
        negotiationInflation,
        affectedZone: ZONES[index % ZONES.length],
        forecastDays: 3 + index,
        risk: riskLevel(shortageRisk),
        recommendation:
          shortageRisk >= 80
            ? "Immediate supplier diversification recommended."
            : shortageRisk >= 60
            ? "Monitor procurement velocity closely."
            : "Supply outlook currently stable.",
      };
    });

    const critical = rows.filter((r) => r.risk === "Critical").length;
    const high = rows.filter((r) => r.risk === "High").length;

    return NextResponse.json({
      ok: true,
      summary: {
        total: rows.length,
        critical,
        high,
      },
      executiveSummary:
        critical > 0
          ? `${critical} procurement category shortage hotspot(s) detected.`
          : "Procurement supply outlook currently stable.",
      rows,
    });
  } catch {
    return NextResponse.json({
      ok: false,
      rows: [],
    });
  }
}
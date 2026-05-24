import { NextResponse } from "next/server";

import { generateConstructionEstimate } from "@/lib/construction-cost/cost-engine";
import { buildConstructionReportHtml } from "@/lib/construction-cost/pdf-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const estimate =
      generateConstructionEstimate(body);

    const html =
      buildConstructionReportHtml(estimate);

    return NextResponse.json({
      success: true,
      html,
      estimate,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate export",
      },
      {
        status: 500,
      },
    );
  }
}

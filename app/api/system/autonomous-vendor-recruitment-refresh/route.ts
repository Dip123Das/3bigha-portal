import { NextResponse } from "next/server";
import { refreshAutonomousVendorRecruitmentIntelligence } from "@/lib/marketplace/autonomous-vendor-recruitment-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await refreshAutonomousVendorRecruitmentIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

export async function GET() {
  const result = await refreshAutonomousVendorRecruitmentIntelligence();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
  });
}

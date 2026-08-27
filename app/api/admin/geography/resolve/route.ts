import { NextResponse } from "next/server";
import { resolveLocation } from "@/lib/geography/resolveLocation";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await requireMasterAdmin(request);
  if ("error" in access) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }
  const body = await request.json();
  const result = await resolveLocation(body);

  return NextResponse.json({
    ok: true,
    input: body,
    result,
  });
}

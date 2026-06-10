import { NextResponse } from "next/server";
import { resolveLocation } from "@/lib/geography/resolveLocation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await resolveLocation(body);

  return NextResponse.json({
    ok: true,
    input: body,
    result,
  });
}

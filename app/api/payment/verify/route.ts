import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy verification endpoint is retired. Verified payment server confirmation is required.",
    },
    { status: 410 }
  );
}

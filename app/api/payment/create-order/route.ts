import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "This legacy payment endpoint is retired. Use the SBI Payment Gateway subscription flow.",
    },
    { status: 410 }
  );
}

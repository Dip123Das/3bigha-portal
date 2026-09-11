import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.redirect(
    "https://3bigha.com/sitemap.xml",
    308
  );
}

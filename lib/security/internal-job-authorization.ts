import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function matchesSecret(candidate: string, expected: string) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export function authorizeInternalJobRequest(request: Request): NextResponse | null {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    return NextResponse.json(
      { ok: false, error: "Internal job authorization is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const schedulerHeader = request.headers.get("x-cron-secret")?.trim() || "";
  const candidate = bearer || schedulerHeader;

  if (!candidate || !matchesSecret(candidate, configured)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized internal job request." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}

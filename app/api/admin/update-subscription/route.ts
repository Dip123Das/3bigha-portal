import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export async function POST(req: Request) {
  const access = await requireMasterAdmin();
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  return NextResponse.json(
    {
      error:
        "Manual and cash subscription activation is disabled. A paid subscription may be activated only after verified SBI Payment Gateway confirmation.",
    },
    { status: 410 }
  );
}

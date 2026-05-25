import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = String(searchParams.get("path") || "").trim();

    if (!path || path.includes("..")) {
      return NextResponse.json(
        { ok: false, error: "Invalid document path." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase.storage
      .from("finance-banker-documents")
      .createSignedUrl(path, 120);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Unable to open document." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
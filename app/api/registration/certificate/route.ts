import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headers() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
  };
}

async function authenticatedClient() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "Login required.",
        },
        {
          status: 401,
          headers: headers(),
        }
      ),
    };
  }

  return { supabase, user };
}

export async function GET() {
  const access = await authenticatedClient();

  if ("error" in access) {
    return access.error;
  }

  const { data, error } = await access.supabase
    .from("registration_verification_certificates")
    .select(
      [
        "id",
        "certificate_number",
        "verification_status",
        "verified_at",
        "issued_at",
        "issuer",
        "holder_name",
        "business_name",
        "status",
        "metadata",
      ].join(",")
    )
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status: 500,
        headers: headers(),
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      certificate: data || null,
    },
    {
      headers: headers(),
    }
  );
}

export async function POST() {
  const access = await authenticatedClient();

  if ("error" in access) {
    return access.error;
  }

  const { data, error } = await access.supabase.rpc(
    "issue_registration_verification_certificate"
  );

  if (error) {
    const message = String(error.message || "");

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: message.includes(
          "only after registration verification"
        )
          ? 409
          : 500,
        headers: headers(),
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      result: data,
    },
    {
      headers: headers(),
    }
  );
}

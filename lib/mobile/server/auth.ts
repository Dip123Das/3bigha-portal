import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type MobileAuthenticatedRequest = {
  source: "bearer" | "cookie";
  supabase: SupabaseClient;
  user: User;
};

export class MobileAuthError extends Error {
  constructor(
    readonly code: "AUTH_REQUIRED" | "INVALID_SESSION" | "CONFIGURATION_ERROR",
    message: string
  ) {
    super(message);
    this.name = "MobileAuthError";
  }
}

function getPublicSupabaseEnvironment() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new MobileAuthError(
      "CONFIGURATION_ERROR",
      "Mobile authentication is not configured."
    );
  }

  return { url, anonKey };
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function authenticateMobileRequest(
  request: Request
): Promise<MobileAuthenticatedRequest> {
  const bearerToken = readBearerToken(request);

  if (bearerToken) {
    const { url, anonKey } = getPublicSupabaseEnvironment();
    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const { data, error } = await supabase.auth.getUser(bearerToken);

    if (error || !data.user) {
      throw new MobileAuthError("INVALID_SESSION", "The mobile session is invalid or expired.");
    }

    return { source: "bearer", supabase, user: data.user };
  }

  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new MobileAuthError("AUTH_REQUIRED", "Sign in to continue.");
  }

  return { source: "cookie", supabase, user: data.user };
}

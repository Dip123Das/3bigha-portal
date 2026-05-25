import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getVerifiedBankerProfile } from "./getVerifiedBankerProfile";

export async function requireVerifiedBanker() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bankerProfile =
    await getVerifiedBankerProfile(user.id);

  if (!bankerProfile) {
    redirect("/banker/apply");
  }

  return bankerProfile;
}
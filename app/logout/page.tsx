"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    (async () => {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    })();
  }, [router]);

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800 }}>Logging out…</h1>
      <p style={{ opacity: 0.75, marginTop: 6 }}>
        Please wait. Redirecting to home.
      </p>
    </div>
  );
}
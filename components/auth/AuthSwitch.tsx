"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthSwitch({ className }: { className: string }) {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(!!data.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (session === null) return null;

  if (session) {
    return (
      <button type="button" className={className} onClick={handleLogout}>
        Logout
      </button>
    );
  }

  const next = encodeURIComponent(pathname || "/");

  return (
    <Link className={className} href={`/login?next=${next}`}>
      Login
    </Link>
  );
}
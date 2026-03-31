"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Mode = "inline" | "button";

export default function AuthButtons({
  mode = "button",
  classNameLogin = "",
  classNameLogout = "",
  loginHref = "/login",
  logoutRedirectTo = "/",
}: {
  mode?: Mode;
  classNameLogin?: string;
  classNameLogout?: string;
  loginHref?: string;
  logoutRedirectTo?: string;
}) {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSignedIn(!!data.session);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      // force refresh server components + go home (or wherever you want)
      router.replace(logoutRedirectTo);
      router.refresh();
    }
  }

  if (loading) {
    // optional: show nothing while checking
    return null;
  }

  // If signed in: show Logout
  if (signedIn) {
    if (mode === "inline") {
      return (
        <button type="button" onClick={handleLogout} className={classNameLogout}>
          Logout
        </button>
      );
    }
    return (
      <button type="button" onClick={handleLogout} className={classNameLogout}>
        Logout
      </button>
    );
  }

  // If NOT signed in: show Login (preserve where user was)
  const next = encodeURIComponent(pathname || "/");
  const href = `${loginHref}?next=${next}`;

  return (
    <Link className={classNameLogin} href={href}>
      Login
    </Link>
  );
}
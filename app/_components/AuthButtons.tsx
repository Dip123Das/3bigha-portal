"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type SessionLite = {
  user: { email?: string | null; id?: string | null };
} | null;

function shortEmail(email?: string | null) {
  if (!email) return "Signed in";
  // example: dipankar…@gmail.com
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shortName = name.length > 7 ? `${name.slice(0, 7)}…` : name;
  return `${shortName}@${domain}`;
}

function prettyRole(role?: string | null, isVendor?: boolean | null) {
  const r = String(role ?? "").trim().toLowerCase();

  if (r === "master_admin") return "Master Admin";
  if (r === "blog_admin") return "Blog Admin";
  if (r === "blogger") return "Blogger";
  if (r === "vendor") return "Vendor";
  if (r === "buyer") return "Buyer";
  if (isVendor === true) return "Vendor";

  return "";
}

export default function AuthButtons() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [session, setSession] = useState<SessionLite>(null);
  const [roleLabel, setRoleLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;

        const s = data.session;
        setSession(s ? { user: { email: s.user.email, id: s.user.id } } : null);

        if (s?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role,is_vendor")
            .eq("id", s.user.id)
            .maybeSingle();

          if (!alive) return;
          setRoleLabel(prettyRole((profile as any)?.role, (profile as any)?.is_vendor));
        } else {
          setRoleLabel("");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!alive) return;

      setSession(s ? { user: { email: s.user.email, id: s.user.id } } : null);

      if (s?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role,is_vendor")
          .eq("id", s.user.id)
          .maybeSingle();

        if (!alive) return;
        setRoleLabel(prettyRole((profile as any)?.role, (profile as any)?.is_vendor));
      } else {
        setRoleLabel("");
      }

      setLoading(false);

      // keep server components fresh
      router.refresh();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    try {
      // immediately reflect in UI
      setSession(null);
      setRoleLabel("");
      setLoading(false);
      await supabase.auth.signOut();
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  // Loading → show Login (prevents flicker)
  if (loading) {
    return (
      <Link className="topBtn topBtnGhost" href="/login">
        Login
      </Link>
    );
  }

  // Logged out → Login
  if (!session) {
    return (
      <Link className="topBtn topBtnGhost" href="/login">
        Login
      </Link>
    );
  }

  // Logged in → show email + Logout
  const email = session.user.email ?? null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        title={email ?? undefined}
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#334155",
          background: "rgba(15, 23, 42, 0.06)",
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(15, 23, 42, 0.10)",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {shortEmail(email)}
      </span>

            {roleLabel ? (
        <span
          style={{
            fontSize: 12,
            fontWeight: 900,
            color: "#1d4ed8",
            background: "#eff6ff",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid #bfdbfe",
            whiteSpace: "nowrap",
          }}
        >
          {roleLabel}
        </span>
      ) : null}

      <button
        type="button"
        className="topBtn topBtnGhost"
        onClick={handleLogout}
        title={email ?? undefined}
      >
        Logout
      </button>
    </div>
  );
}
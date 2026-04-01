"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveAccessForUser, getDefaultPostLoginPath } from "@/lib/access/resolveAccess";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

export const dynamic = "force-dynamic";

function hardRedirect(path: string) {
  if (typeof window !== "undefined") {
    window.location.replace(path);
    return;
  }
}

function PostLoginPageInner() {
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [msg, setMsg] = useState("Preparing your access…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const next = safeNextPath(sp.get("next"));

        console.log("POST_LOGIN_V4_START", { next });

        setMsg("Checking your session…");

        const sessionRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Post-login session lookup timed out after 4000ms")),
              4000
            )
          ),
        ]);

        if (!alive) return;

        const session = (sessionRes as any)?.data?.session ?? null;
        const user = session?.user ?? null;

        console.log("POST_LOGIN_V4_SESSION", {
          hasSession: !!session,
          userId: user?.id ?? null,
          email: user?.email ?? null,
        });

        if (!user?.id) {
          setMsg("No active session found. Redirecting to login…");
          setTimeout(() => {
            hardRedirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          }, 800);
          return;
        }

        setMsg("Resolving your dashboard access…");

        let redirectTo = next || "/dashboard";

        try {
          const access = await Promise.race([
            resolveAccessForUser(supabase, user.id, user.email ?? null),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Access resolution timed out after 3000ms")),
                3000
              )
            ),
          ]);

          if (!alive) return;

          redirectTo = next || getDefaultPostLoginPath(access);
        } catch (accessErr) {
          console.error("POST_LOGIN_V4_ACCESS_FALLBACK", accessErr);
          redirectTo = next || "/";
        }

        console.log("POST_LOGIN_V4_REDIRECT", { redirectTo });

        hardRedirect(redirectTo);
      } catch (e: any) {
        console.error("POST_LOGIN_V4_FAIL", e);

        if (!alive) return;

        const next = safeNextPath(sp.get("next"));
        setMsg(`Could not complete login routing: ${e?.message || "Unknown error"}`);

        setTimeout(() => {
          hardRedirect(next || "/");
        }, 1000);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sp, supabase]);

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 20,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Signing you in</div>
        <div style={{ opacity: 0.8 }}>{msg}</div>
      </div>
    </main>
  );
}

export default function PostLoginPageClient() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "40px 20px" }}>
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 16,
              padding: 20,
              background: "white",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
              Signing you in
            </div>
            <div style={{ opacity: 0.8 }}>Preparing your access…</div>
          </div>
        </main>
      }
    >
      <PostLoginPageInner />
    </Suspense>
  );
}
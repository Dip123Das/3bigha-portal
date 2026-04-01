"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

function AuthCallbackPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [msg, setMsg] = useState("Finishing login…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const next = safeNextPath(sp.get("next"));
        const code = sp.get("code");
        const errorDesc = sp.get("error_description") || sp.get("error");

        if (errorDesc) {
          console.error("AUTH_CALLBACK_PROVIDER_ERROR", errorDesc);
          if (!alive) return;
          setMsg("Login failed. Redirecting…");
          setTimeout(() => {
            router.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          }, 1000);
          return;
        }

        setMsg("Checking existing session…");

        const sessionRes = await supabase.auth.getSession();
        const existingSession = sessionRes.data.session ?? null;

        if (existingSession?.user?.id) {
          console.log("AUTH_CALLBACK_ALREADY_SIGNED_IN", {
            userId: existingSession.user.id,
          });
          if (!alive) return;
          setMsg("Already signed in. Redirecting…");
          router.replace(`/auth/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          return;
        }

        if (!code) {
          console.warn("AUTH_CALLBACK_NO_CODE");
          if (!alive) return;
          setMsg("Missing login code. Redirecting…");
          setTimeout(() => {
            router.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          }, 1000);
          return;
        }

        setMsg("Exchanging session…");

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!alive) return;

        if (error) {
          console.error("AUTH_CALLBACK_EXCHANGE_ERROR", error);

          const latestSessionRes = await supabase.auth.getSession();
          const latestSession = latestSessionRes.data.session ?? null;

          if (latestSession?.user?.id) {
            setMsg("Signed in. Redirecting…");
            router.replace(`/auth/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
            return;
          }

          setMsg("Could not complete login. Redirecting…");
          setTimeout(() => {
            router.replace(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
          }, 1200);
          return;
        }

        console.log("AUTH_CALLBACK_SUCCESS");

        setMsg("Redirecting…");
        router.replace(`/auth/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
      } catch (e) {
        console.error("AUTH_CALLBACK_FAIL", e);
        if (!alive) return;
        setMsg("Unexpected error. Redirecting…");
        setTimeout(() => {
          router.replace("/login");
        }, 1200);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, sp, supabase]);

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
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          Auth Callback
        </div>
        <div style={{ opacity: 0.8 }}>{msg}</div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
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
              Auth Callback
            </div>
            <div style={{ opacity: 0.8 }}>Finishing login…</div>
          </div>
        </main>
      }
    >
      <AuthCallbackPageInner />
    </Suspense>
  );
}
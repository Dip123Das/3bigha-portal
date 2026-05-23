"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

export default function AuthCallbackPageClient() {
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

        const exchangeRes = await Promise.race([
          supabase.auth.exchangeCodeForSession(code),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("Auth callback exchange timed out after 10000ms")),
              10000
            )
          ),
        ]);

        if (!alive) return;

        const { error } = exchangeRes as Awaited<
          ReturnType<typeof supabase.auth.exchangeCodeForSession>
        >;

        if (error) {
          console.error("AUTH_CALLBACK_EXCHANGE_ERROR", error);

          const sessionRes = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Session check timed out after 4000ms")),
                4000
              )
            ),
          ]);

          if (!alive) return;

          const session = (sessionRes as any)?.data?.session ?? null;

          if (session?.user?.id) {
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

        setMsg("Signed in. Redirecting…");
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
          borderRadius: 12,
          padding: 14,
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
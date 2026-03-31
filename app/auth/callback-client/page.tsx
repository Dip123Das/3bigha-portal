"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = safeNextPath(sp.get("next"));
  const code = sp.get("code");

  const [msg, setMsg] = useState("Finishing login…");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!code) {
          router.replace(`/login?next=${encodeURIComponent(next)}&error=missing_code`);
          return;
        }

        const supabase = getSupabaseBrowser();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          router.replace(
            `/login?next=${encodeURIComponent(next)}&error=auth_callback_failed&error_description=${encodeURIComponent(
              error.message || "Callback failed"
            )}`
          );
          return;
        }

        if (!alive) return;

        setMsg("Login successful. Redirecting…");

        // ✅ IMPORTANT: do not go directly to next
        // Always pass through post-login so session/access routing stays consistent
        router.replace(`/auth/post-login?next=${encodeURIComponent(next)}`);
      } catch (e: any) {
        const m = e?.message || "Callback failed.";
        router.replace(
          `/login?next=${encodeURIComponent(next)}&error=auth_callback_failed&error_description=${encodeURIComponent(m)}`
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, [code, next, router]);

  return (
    <div className="container pageBody" style={{ paddingTop: 24 }}>
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          padding: 14,
          background: "#fff",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16 }}>Auth Callback</div>
        <div style={{ marginTop: 8, opacity: 0.8 }}>{msg}</div>
      </div>
    </div>
  );
}
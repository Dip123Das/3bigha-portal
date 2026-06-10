"use client";

import { useEffect } from "react";

export default function AppOAuthReturnBridge() {
  useEffect(() => {
    let cleanup: any;

    async function setup() {
      try {
        const { App } = await import("@capacitor/app");

        const listener = await App.addListener("appUrlOpen", (event) => {
          const url = event?.url || "";
          if (!url.startsWith("com.threebigha.mobile://auth/callback")) return;

          const parsed = new URL(url);
          const next = parsed.searchParams.get("next") || "/auth/post-login";
          const code = parsed.searchParams.get("code");
          const error = parsed.searchParams.get("error");

          const webCallback = new URL("/auth/callback", window.location.origin);

          if (code) webCallback.searchParams.set("code", code);
          if (error) webCallback.searchParams.set("error", error);
          webCallback.searchParams.set("next", next);

          window.location.href = webCallback.toString();
        });

        cleanup = listener;
      } catch {
        // Browser fallback: no Capacitor App plugin available.
      }
    }

    setup();

    return () => {
      cleanup?.remove?.();
    };
  }, []);

  return null;
}

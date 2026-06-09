"use client";

import { useEffect } from "react";

export default function AppOAuthBrowserBounce() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const appOauth = url.searchParams.get("app_oauth");

    if (!code && !error) return;
    if (appOauth !== "1") return;

    const deep = new URL("com.threebigha.mobile://auth/callback");

    if (code) deep.searchParams.set("code", code);
    if (error) deep.searchParams.set("error", error);

    deep.searchParams.set("next", url.searchParams.get("next") || "/auth/post-login");

    window.location.href = deep.toString();
  }, []);

  return null;
}

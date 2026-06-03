"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Msg = { type: "idle" | "info" | "success" | "error"; text: string };

function prettyError(e: any) {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (e?.message) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function safeNextPath(input: string | null) {
  if (!input) return "/";
  if (input.startsWith("/")) return input; // internal only
  return "/";
}

function addOpenEnquiryToNext(nextPath: string, openEnquiry: string | null) {
  if (openEnquiry !== "1") return nextPath;
  const u = new URL(nextPath, "http://local");
  u.searchParams.set("openEnquiry", "1");
  return u.pathname + (u.search ? u.search : "");
}

function getAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

function buildCallbackRedirectTo(nextWithOpenEnquiry: string) {
  const baseUrl = getAppBaseUrl();
  const u = new URL(`${baseUrl}/auth/callback`);
  u.searchParams.set("next", nextWithOpenEnquiry);
  return u.toString();
}

function buildPostLoginRedirectTo(nextWithOpenEnquiry: string) {
  return `/auth/post-login?next=${encodeURIComponent(nextWithOpenEnquiry)}`;
}

function maskKey(k?: string | null) {
  if (!k) return "(missing)";
  if (k.length <= 10) return "***";
  return `${k.slice(0, 6)}…${k.slice(-4)}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function readTextSafe(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

// ✅ Keep your probe (no deletion)
async function probeSupabaseAuth(args: {
  supabaseUrl: string;
  anonKey: string;
  redirectTo: string;
  email: string;
  debug: (s: string) => void;
}) {
  const { supabaseUrl, anonKey, redirectTo, email, debug } = args;
  const base = supabaseUrl.replace(/\/$/, "");
  const healthUrl = `${base}/auth/v1/health`;

  debug(`PROBE: GET ${healthUrl}`);
  try {
    const r = await fetchWithTimeout(healthUrl, { method: "GET" }, 6000);
    const text = await readTextSafe(r);
    debug(`PROBE health status=${r.status} body=${text.slice(0, 120) || "(empty)"}`);
    if (!r.ok) {
      return { ok: false, hint: `Auth health failed (${r.status}). Network/firewall/SUPABASE_URL issue.` };
    }
  } catch (e: any) {
    const msg = prettyError(e);
    debug(`PROBE health error: ${msg}`);
    return {
      ok: false,
      hint:
        `Cannot reach Supabase Auth. Browser error: "${msg}". ` +
        `If "Failed to fetch" / "ERR_BLOCKED_BY_CLIENT" then extension/firewall is blocking.`,
    };
  }

  const otpUrl = new URL(`${base}/auth/v1/otp`);
  otpUrl.searchParams.set("redirect_to", redirectTo);

  debug(`PROBE: POST ${otpUrl.toString()}`);
  try {
    const r = await fetchWithTimeout(
      otpUrl.toString(),
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, create_user: true }),
      },
      8000
    );
    const text = await readTextSafe(r);
    debug(`PROBE otp status=${r.status} body=${text.slice(0, 220) || "(empty)"}`);
    if (!r.ok) {
      return {
        ok: false,
        hint:
          `OTP endpoint responded ${r.status}. Common causes: redirect URL not allowed, invalid API key, email auth disabled.`,
      };
    }
  } catch (e: any) {
    const msg = prettyError(e);
    debug(`PROBE otp error: ${msg}`);
    return {
      ok: false,
      hint:
        `OTP request failed in browser: "${msg}". ` +
        `If "Failed to fetch"/blocked, try Incognito or allow *.supabase.co in firewall.`,
    };
  }

  return { ok: true, hint: "Supabase Auth reachable and OTP endpoint responds." };
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const debugEnabled = sp.get("debug") === "1";
  const nextRaw = sp.get("next");
  const openEnquiry = sp.get("openEnquiry");

  // ✅ Read callback errors (from /auth/callback) and show clearly
  const cbErr = sp.get("error");
  const cbErrDesc = sp.get("error_description");

  // ✅ Critical: only redirect automatically if the user came here from a flow that provided next/openEnquiry
  const hasExplicitNext = !!(nextRaw && nextRaw.trim().length > 0);
  const hasPremiumIntent = openEnquiry === "1";
  const shouldAutoRedirectWhenSession = hasExplicitNext || hasPremiumIntent;

  const nextPath = useMemo(() => safeNextPath(nextRaw), [nextRaw]);
  const nextWithOpen = useMemo(() => addOpenEnquiryToNext(nextPath, openEnquiry), [nextPath, openEnquiry]);

  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [msg, setMsg] = useState<Msg>({ type: "idle", text: "" });
  const [phase, setPhase] = useState("idle");

  const [loadingMagic, setLoadingMagic] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingPhoneSend, setLoadingPhoneSend] = useState(false);
  const [loadingPhoneVerify, setLoadingPhoneVerify] = useState(false);

  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const elapsedTimerRef = useRef<any>(null);

  const debugLines = useRef<string[]>([]);
  const debug = (s: string) => {
    const line = `[${new Date().toISOString()}] ${s}`;
    debugLines.current = [line, ...debugLines.current].slice(0, 200);
    if (debugEnabled) console.log(s);
    (window as any).__loginDebug = debugLines.current;
  };

  const startElapsed = () => {
    stopElapsed();
    const start = Date.now();
    elapsedTimerRef.current = setInterval(() => setElapsedMs(Date.now() - start), 200);
  };
  const stopElapsed = () => {
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    elapsedTimerRef.current = null;
    setElapsedMs(0);
  };

  // ✅ Surface callback error instantly (no guessing, no hidden failures)
  useEffect(() => {
    if (cbErr || cbErrDesc) {
      const rawDesc = String(cbErrDesc || "").toLowerCase();
      let text = "";
      let extraHint = "";

      if (
        cbErr === "access_denied" &&
        (rawDesc.includes("expired") || rawDesc.includes("invalid"))
      ) {
        text =
          "This magic link is invalid or has expired. Please request a fresh login link and use only the newest email.";
        extraHint =
          " Important: open the latest link immediately, in the same browser, and do not reuse old links.";
      } else if (cbErr === "missing_env") {
        text =
          "Login is not configured correctly in this environment.";
        extraHint =
          " Fix: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local and restart `npm run dev`.";
      } else if (cbErr === "auth_callback_fetch_failed") {
        text =
          "The login callback could not reach Supabase Auth.";
        extraHint =
          " Fix: SUPABASE_URL may be wrong/missing, or network/firewall blocked. Run 'Run auth network probe' to confirm.";
      } else if (
        cbErr === "auth_callback_failed" &&
        rawDesc.includes("fetch")
      ) {
        text =
          "The login callback failed while contacting Supabase.";
        extraHint =
          " Fix: callback could not reach Supabase. Check env + restart dev server. Also ensure Supabase Auth URL config allows http://localhost:3000/auth/callback.";
      } else {
        text =
          `Login callback error: ${cbErr || "(unknown)"}` +
          (cbErrDesc ? ` — ${cbErrDesc}` : "");
      }

      setMsg({
        type: "error",
        text: `${text}${extraHint ? ` ${extraHint}` : ""}`,
      });
      setPhase("callback-error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cbErr, cbErrDesc]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setPhase("session-check");

        const supabase = getSupabaseBrowser();

        const authRes = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 8000)
          ),
        ]);

        if (!alive) return;

        const session = (authRes as any)?.data?.session ?? null;
        const user = session?.user ?? null;
        const ok = !!user?.id;

        setHasSession(ok);
        setSessionChecked(true);
        setPhase(ok ? "session-present" : "session-none");

        if (ok && shouldAutoRedirectWhenSession) {
          router.replace(buildPostLoginRedirectTo(nextWithOpen));
          return;
        }

        if (ok && !shouldAutoRedirectWhenSession) {
          setMsg({
            type: "info",
            text: "You are already signed in. You can continue browsing, or use Google / Email / Phone to switch account.",
          });
        }
      } catch (e: any) {
        if (!alive) return;
        setSessionChecked(true);
        setHasSession(false);
        setPhase("session-none");
        setMsg({ type: "idle", text: "" });
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextWithOpen, shouldAutoRedirectWhenSession]);

  const onGoogle = async () => {
    setMsg({ type: "idle", text: "" });
    if (loadingGoogle) return;
    setLoadingGoogle(true);

    try {
      setPhase("google-start");
      const supabase = getSupabaseBrowser();
      const redirectTo = buildCallbackRedirectTo(nextWithOpen);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({
          type: "info",
          text: data?.url ? "Redirecting to Google…" : "Opening Google sign-in…",
        });
      }
    } catch (e: any) {
      setMsg({ type: "error", text: prettyError(e) });
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ✅ Key fix stays: use SAME client as admin (cookie/session compatible)
  const onSendMagicLink = async () => {
    const addr = email.trim();
    if (!addr) return setMsg({ type: "error", text: "Please enter your email." });
    if (loadingMagic) return;

    setMsg({ type: "idle", text: "" });
    setLoadingMagic(true);
    setPhase("magic-start");
    startElapsed();

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      debug(`Env: url=${supabaseUrl || "(missing)"} anon=${maskKey(anonKey)}`);

      const supabase = getSupabaseBrowser();
      const callbackUrl = buildCallbackRedirectTo(nextWithOpen);
      debug(`Magic callbackUrl=${callbackUrl}`);

      setPhase("magic-signinwithotp");
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: {
          emailRedirectTo: callbackUrl,
          shouldCreateUser: true,
        },
      });

      if (error) throw error;

      setPhase("magic-success");
      setMsg({
        type: "success",
        text:
          "✅ Magic link sent! Please open only the newest email, click it immediately, and use the same browser window.",
      });
    } catch (e: any) {
      setPhase("magic-error");
      setMsg({ type: "error", text: prettyError(e) });
    } finally {
      stopElapsed();
      setLoadingMagic(false);
    }
  };

  const runAuthNetworkProbe = async () => {
    const addr = email.trim() || "test@example.com";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const callbackUrl = buildCallbackRedirectTo(nextWithOpen);

    setMsg({ type: "info", text: "Running auth network probe…" });
    setPhase("probe");

    if (!supabaseUrl || !anonKey) {
      setMsg({ type: "error", text: "Missing Supabase env in browser build." });
      return;
    }

    const r = await probeSupabaseAuth({
      supabaseUrl,
      anonKey,
      redirectTo: callbackUrl,
      email: addr,
      debug,
    });

    setMsg({ type: r.ok ? "success" : "error", text: r.hint });
    setPhase(r.ok ? "probe-ok" : "probe-fail");
  };

  const onSendPhoneOtp = async () => {
    setMsg({ type: "idle", text: "" });
    const p = phone.trim();
    if (!p) return setMsg({ type: "error", text: "Please enter phone number." });
    if (loadingPhoneSend) return;

    setLoadingPhoneSend(true);
    try {
      setPhase("phone-send");
      const supabase = getSupabaseBrowser();
      // @ts-ignore
      const { error } = await supabase.auth.signInWithOtp({ phone: p });
      if (error) setMsg({ type: "error", text: error.message });
      else setMsg({ type: "success", text: "OTP sent." });
    } catch (e: any) {
      setMsg({ type: "error", text: prettyError(e) });
    } finally {
      setLoadingPhoneSend(false);
    }
  };

  const onVerifyPhoneOtp = async () => {
    setMsg({ type: "idle", text: "" });
    const p = phone.trim();
    const t = otp.trim();
    if (!p || !t) return setMsg({ type: "error", text: "Enter phone + OTP." });
    if (loadingPhoneVerify) return;

    setLoadingPhoneVerify(true);
    try {
      setPhase("phone-verify");
      const supabase = getSupabaseBrowser();
      // @ts-ignore
      const { error } = await supabase.auth.verifyOtp({ phone: p, token: t, type: "sms" });
      if (error) {
        setMsg({ type: "error", text: error.message });
      } else {
        setMsg({ type: "success", text: "Logged in! Redirecting…" });
        if (shouldAutoRedirectWhenSession) {
          router.replace(buildPostLoginRedirectTo(nextWithOpen));
        } else {
          router.replace("/auth/post-login");
        }
      }
    } catch (e: any) {
      setMsg({ type: "error", text: prettyError(e) });
    } finally {
      setLoadingPhoneVerify(false);
    }
  };

  const continueAsGuest = () => {
    if (shouldAutoRedirectWhenSession) {
      router.replace(nextWithOpen);
    } else {
      router.replace("/");
    }
  };

  useEffect(() => {
    if (!cbErr && !cbErrDesc) return;

    const t = setTimeout(() => {
      const u = new URL(window.location.href);
      u.searchParams.delete("error");
      u.searchParams.delete("error_description");
      router.replace(
        `${u.pathname}${u.search ? u.search : ""}`,
        { scroll: false }
      );
    }, 1200);

    return () => clearTimeout(t);
  }, [cbErr, cbErrDesc, router]);

  const nextLooksInvalid = nextWithOpen.includes("/services/<id>") || nextWithOpen.includes("%3Cid%3E");

  return (
    <div className="layout-container loginWrap" style={{ padding: "34px 0 60px" }}>
      <div
        className="ui-card"
        style={{
          maxWidth: 520,
          margin: "0 auto",
          borderRadius: 22,
          boxShadow: "0 24px 70px rgba(15,23,42,0.10)",
        }}
      >
        <div
          className="ui-card__header"
          style={{
            display: "block",
            textAlign: "center",
            paddingTop: 24,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 30, color: "#0f172a" }}>
            Welcome to 3Bigha
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#64748b", fontWeight: 700 }}>
            Login to continue your marketplace work
          </div>
        </div>

        <div className="ui-card__body">
          {msg.type !== "idle" ? (
            <div
              style={{
                marginBottom: 12,
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                border:
                  msg.type === "success"
                    ? "1px solid #bfdbfe"
                    : msg.type === "error"
                    ? "1px solid #fecaca"
                    : "1px solid #e2e8f0",
                background:
                  msg.type === "success"
                    ? "#eff6ff"
                    : msg.type === "error"
                    ? "#fef2f2"
                    : "#f8fafc",
                color: msg.type === "error" ? "#991b1b" : "#0f172a",
                fontWeight: 700,
              }}
            >
              {msg.text}
            </div>
          ) : null}

          {!sessionChecked ? (
            <div style={{ color: "#64748b", fontSize: 14, fontWeight: 700 }}>
              Checking session…
            </div>
          ) : hasSession && shouldAutoRedirectWhenSession ? (
            <div style={{ color: "#1d4ed8", fontSize: 14, fontWeight: 800 }}>
              Already signed in. Redirecting…
            </div>
          ) : (
            <>
              <button
                className="ui-btn ui-btn--full ui-btn--primary"
                onClick={onGoogle}
                disabled={loadingGoogle}
                type="button"
                style={{
                  height: 48,
                  fontSize: 15,
                  fontWeight: 950,
                  borderRadius: 14,
                }}
              >
                {loadingGoogle ? "Opening Google…" : "Continue with Google"}
              </button>

              <div style={{ margin: "18px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ height: 1, background: "#e2e8f0", flex: 1 }} />
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>or</div>
                <div style={{ height: 1, background: "#e2e8f0", flex: 1 }} />
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button className={`ui-pill ${tab === "email" ? "ui-pill--selected" : ""}`} onClick={() => setTab("email")} type="button">
                  Email Magic Link
                </button>
                <button className={`ui-pill ${tab === "phone" ? "ui-pill--selected" : ""}`} onClick={() => setTab("phone")} type="button">
                  Phone OTP
                </button>
              </div>

              {tab === "email" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (msg.type === "error") {
                        setMsg({ type: "idle", text: "" });
                        if (phase === "callback-error") setPhase("idle");
                      }
                    }}
                    placeholder="Enter your email"
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      padding: "13px 14px",
                      fontSize: 15,
                    }}
                  />

                  <button
                    className="ui-btn ui-btn--full ui-btn--primary"
                    onClick={onSendMagicLink}
                    disabled={loadingMagic}
                    type="button"
                    style={{ height: 46, borderRadius: 14, fontWeight: 950 }}
                  >
                    {loadingMagic ? `Sending… ${Math.floor(elapsedMs / 1000)}s` : "Send magic link"}
                  </button>

                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, fontWeight: 700 }}>
                    We will send a secure login link to your email.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      padding: "13px 14px",
                      fontSize: 15,
                    }}
                  />

                  <button
                    className="ui-btn ui-btn--full ui-btn--secondary"
                    onClick={onSendPhoneOtp}
                    disabled={loadingPhoneSend}
                    type="button"
                    style={{ height: 46, borderRadius: 14, fontWeight: 950 }}
                  >
                    {loadingPhoneSend ? "Sending OTP…" : "Send OTP"}
                  </button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="OTP"
                      style={{
                        width: "100%",
                        borderRadius: 14,
                        border: "1px solid #e2e8f0",
                        padding: "13px 14px",
                        fontSize: 15,
                      }}
                    />
                    <button
                      className="ui-btn ui-btn--primary ui-btn--full"
                      onClick={onVerifyPhoneOtp}
                      disabled={loadingPhoneVerify}
                      type="button"
                      style={{ borderRadius: 14, fontWeight: 950 }}
                    >
                      {loadingPhoneVerify ? "Verifying…" : "Verify"}
                    </button>
                  </div>
                </div>
              )}

              <button
                className="ui-btn ui-btn--full ui-btn--ghost"
                onClick={continueAsGuest}
                type="button"
                style={{ marginTop: 14, borderRadius: 14, fontWeight: 900 }}
              >
                Continue as guest →
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .loginWrap {
          position: relative;
        }
        .loginGrid {
          display: grid;
          grid-template-columns: minmax(320px, 520px); justify-content:center;
          gap: 10px;
          align-items: stretch;
        }
        @media (max-width: 980px) {
          .loginGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
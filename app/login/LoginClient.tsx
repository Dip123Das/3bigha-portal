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

function buildCallbackRedirectTo(origin: string, nextWithOpenEnquiry: string) {
  const u = new URL(`${origin}/auth/callback`);
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
      const origin = window.location.origin;
      const redirectTo = buildCallbackRedirectTo(origin, nextWithOpen);

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
      const origin = window.location.origin;
      const callbackUrl = buildCallbackRedirectTo(origin, nextWithOpen);
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
    const origin = window.location.origin;
    const callbackUrl = buildCallbackRedirectTo(origin, nextWithOpen);

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
    <div className="layout-container loginWrap" style={{ padding: "28px 0 40px" }}>
      <div className="loginGrid">
        {/* LEFT: Hero */}
        <div
          className="ui-card"
          style={{
            background:
              "radial-gradient(1200px 600px at 20% 10%, rgba(11,87,208,0.35), transparent 55%)," +
              "radial-gradient(900px 500px at 80% 60%, rgba(0,180,120,0.25), transparent 60%)," +
              "#0b0f1a",
            color: "white",
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <div className="ui-card__body" style={{ padding: 22 }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>3Bigha</div>
            <h1 style={{ margin: "10px 0 8px", fontSize: 44, lineHeight: 1.05 }}>Sign in to move faster.</h1>
            <div style={{ fontSize: 14, opacity: 0.82, maxWidth: 520 }}>
              Verified listings, instant enquiries, and clean buyer inbox threads.
            </div>

            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Premium UX</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Auto-return to listing after login + auto-open enquiry modal.</div>
              </div>

              <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Secure by default</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Passwordless login via Supabase Auth.</div>
              </div>

              <div style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.08)" }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Redirect chain</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>/login → /auth/callback → next (and openEnquiry auto-opens)</div>
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>
              Redirect after login:{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {shouldAutoRedirectWhenSession ? nextWithOpen : "(none) – opened directly"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Login box */}
        <div className="ui-card">
          <div className="ui-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Login</div>
            <div style={{ fontSize: 12, color: "#5b6472" }}>Choose a method</div>
          </div>

          <div className="ui-card__body">
            {/* Status box */}
            <div
              style={{
                border: "1px solid #e7e9ee",
                borderRadius: 12,
                padding: 10,
                background: "#f7f8fb",
                fontSize: 12,
                color: "#142033",
              }}
            >
              <div>
                <b>phase:</b> {phase}
              </div>
              <div>
                <b>loadingMagic:</b> {String(loadingMagic)} {loadingMagic ? `(${Math.floor(elapsedMs / 1000)}s)` : ""}
              </div>
              <div>
                <b>next:</b>{" "}
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                  {shouldAutoRedirectWhenSession ? nextWithOpen : "(none)"}
                </span>
              </div>
            </div>

            {nextLooksInvalid ? (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid #ffd3d3",
                  background: "#fff1f1",
                  color: "#8a1f1f",
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 13,
                }}
              >
                ⚠️ Your redirect URL contains <b>/services/&lt;id&gt;</b> (placeholder). It must be a real service id.
              </div>
            ) : null}

            {/* Message banner */}
            {msg.type !== "idle" ? (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 13,
                  border:
                    msg.type === "success"
                      ? "1px solid #cfe0ff"
                      : msg.type === "error"
                      ? "1px solid #ffd3d3"
                      : "1px solid #e2e7f2",
                  background: msg.type === "success" ? "#eef4ff" : msg.type === "error" ? "#fff1f1" : "#f3f6fb",
                  color: msg.type === "error" ? "#8a1f1f" : "#142033",
                }}
              >
                {msg.text}
              </div>
            ) : null}

            {!sessionChecked ? (
              <div style={{ marginTop: 12, color: "#5b6472", fontSize: 13 }}>Checking session…</div>
            ) : hasSession && shouldAutoRedirectWhenSession ? (
              <div style={{ marginTop: 12, color: "#0b57d0", fontSize: 13 }}>Already signed in. Redirecting…</div>
            ) : (
              <>
                <div style={{ marginTop: 12 }}>
                  <button className="ui-btn ui-btn--full ui-btn--secondary" onClick={onGoogle} disabled={loadingGoogle}>
                    {loadingGoogle ? "Opening Google…" : "Continue with Google"}
                  </button>
                </div>

                <div style={{ margin: "14px 0 10px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ height: 1, background: "#e7e9ee", flex: 1 }} />
                  <div style={{ fontSize: 12, color: "#5b6472" }}>or</div>
                  <div style={{ height: 1, background: "#e7e9ee", flex: 1 }} />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className={`ui-pill ${tab === "email" ? "ui-pill--selected" : ""}`} onClick={() => setTab("email")} type="button">
                    Email
                  </button>
                  <button className={`ui-pill ${tab === "phone" ? "ui-pill--selected" : ""}`} onClick={() => setTab("phone")} type="button">
                    Phone OTP
                  </button>
                </div>

                {tab === "email" ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Email</div>
                      <input
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (msg.type === "error") {
                            setMsg({ type: "idle", text: "" });
                            if (phase === "callback-error") setPhase("idle");
                          }
                        }}
                        placeholder="you@example.com"
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          border: "1px solid #e7e9ee",
                          padding: "10px 12px",
                          fontSize: 14,
                        }}
                      />
                    </div>

                    <button className="ui-btn ui-btn--full ui-btn--primary" onClick={onSendMagicLink} disabled={loadingMagic} type="button">
                      {loadingMagic ? `Sending… ${Math.floor(elapsedMs / 1000)}s` : "Send magic link"}
                    </button>

                    <button className="ui-btn ui-btn--full ui-btn--ghost" onClick={runAuthNetworkProbe} type="button">
                      Run auth network probe
                    </button>
                    <div style={{ fontSize: 12, color: "#5b6472", lineHeight: 1.5 }}>
                      Tip: every new magic link replaces the previous one. If you requested multiple emails, use only the latest link.
                    </div>

                    <div style={{ fontSize: 12, color: "#5b6472" }}>
                      After clicking the link in your email, you’ll return to{" "}
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                        {shouldAutoRedirectWhenSession ? nextWithOpen : "/"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Phone</div>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          border: "1px solid #e7e9ee",
                          padding: "10px 12px",
                          fontSize: 14,
                        }}
                      />
                    </div>

                    <button className="ui-btn ui-btn--full ui-btn--secondary" onClick={onSendPhoneOtp} disabled={loadingPhoneSend} type="button">
                      {loadingPhoneSend ? "Sending OTP…" : "Send OTP"}
                    </button>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="OTP"
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          border: "1px solid #e7e9ee",
                          padding: "10px 12px",
                          fontSize: 14,
                        }}
                      />
                      <button className="ui-btn ui-btn--primary ui-btn--full" onClick={onVerifyPhoneOtp} disabled={loadingPhoneVerify} type="button">
                        {loadingPhoneVerify ? "Verifying…" : "Verify & Login"}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <button className="ui-btn ui-btn--full ui-btn--ghost" onClick={continueAsGuest} type="button">
                    Continue as guest →
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <a
                    href={`/login?next=${encodeURIComponent(nextPath)}${openEnquiry === "1" ? "&openEnquiry=1" : ""}&debug=1`}
                    style={{ fontSize: 12, color: "#5b6472", fontWeight: 700 }}
                  >
                    Debug view
                  </a>
                </div>

                {debugEnabled ? (
                  <div style={{ marginTop: 12, border: "1px solid #e7e9ee", borderRadius: 12, background: "#f7f8fb" }}>
                    <div style={{ padding: 10, fontSize: 12, fontWeight: 800, color: "#142033" }}>Debug log</div>
                    <pre style={{ margin: 0, padding: 10, maxHeight: 240, overflow: "auto", fontSize: 11, color: "#142033" }}>
                      {debugLines.current.join("\n")}
                    </pre>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .loginWrap {
          position: relative;
        }
        .loginGrid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 18px;
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
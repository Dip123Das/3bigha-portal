"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export type Props = {
  module: "property" | "material" | "service" | "rental" | "other" | string;
  refId: string;
  title?: string;
  priceText?: string;
  vendorUserId?: string | null;
  defaultMessage?: string;
  buttonLabel?: string;
  nextUrl?: string;
  enquiriesTable?: string;
  messagesTable?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function safePath(p?: string | null) {
  const s = String(p ?? "").trim();
  if (!s) return null;
  if (!s.startsWith("/")) return null;
  if (s.toLowerCase().startsWith("/login")) return null;
  if (s.toLowerCase().startsWith("/auth/callback")) return null;
  return s;
}

function isPlaceholderPath(p?: string | null) {
  const s = String(p ?? "").trim().toLowerCase();
  return (
    s.includes("/<id>") ||
    s.includes("%3cid%3e") ||
    s.includes("<id>") ||
    s.includes("/[conversationid]") ||
    s.includes("[conversationid]") ||
    s.includes("/[id]") ||
    s.includes("[id]") ||
    /\/id(?:\/|$|\?)/i.test(s)
  );
}

function isBadDynamicValue(v?: string | null) {
  const s = String(v ?? "").trim().toLowerCase();
  return !s || s === "id" || s === "[id]" || s === "[conversationid]" || s === "<id>";
}

function modulePublicDetailPath(module: string, refId: string) {
  const m = String(module ?? "").trim().toLowerCase();
  const id = encodeURIComponent(String(refId ?? "").trim());

  if (m === "material") return `/materials/${id}`;
  if (m === "service") return `/services/${id}`;
  if (m === "rental") return `/rentals/${id}`;
  if (m === "property") return `/property/${id}`;
  return `/${m}/${id}`;
}

function draftKey(module: string, refId: string) {
  return `enquiryDraft::${String(module)}::${String(refId)}`;
}

export default function SendEnquiryButton({
  module,
  refId,
  title,
  priceText,
  vendorUserId = null,
  defaultMessage,
  buttonLabel = "Send Enquiry",
  nextUrl,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const enquiryName = useMemo(() => {
    const t = (title ?? "").trim();
    if (t) return t;
    return `${String(module)} enquiry`;
  }, [title, module]);

  const computedDefaultMessage = useMemo(() => {
    const dm = (defaultMessage ?? "").trim();
    if (dm) return dm;

    const t = (title ?? "").trim();
    const p = (priceText ?? "").trim();

    if (t && p) return `Hi, I am interested in this ${module} (${t}) at ${p}. Please share details.`;
    if (t) return `Hi, I am interested in this ${module} (${t}). Please share details.`;
    return `Hi, I am interested in this ${module}. Please share details.`;
  }, [defaultMessage, module, title, priceText]);

  const [msg, setMsg] = useState(computedDefaultMessage);

  useEffect(() => {
    const shouldOpen = searchParams.get("openEnquiry");
    if (shouldOpen !== "1") return;

    setOpen(true);
    setErr(null);
    setOk(null);

    try {
      const k = draftKey(String(module), String(refId));
      const draft = sessionStorage.getItem(k);
      if (draft && draft.trim()) {
        setMsg(draft);
      } else {
        setMsg((prev) => (prev?.trim() ? prev : computedDefaultMessage));
      }
      sessionStorage.removeItem(k);
    } catch {
      setMsg((prev) => (prev?.trim() ? prev : computedDefaultMessage));
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("openEnquiry");
      window.history.replaceState({}, "", url.toString());
    } catch {}

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setErr(null);
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function getSessionSafe() {
    const sRes: any = await supabase.auth.getSession();
    if (sRes?.error) throw new Error(sRes.error.message);

    const session = sRes?.data?.session ?? sRes?.session ?? null;
    if (session) return session;

    const rRes: any = await supabase.auth.refreshSession();
    if (rRes?.error) return null;

    return rRes?.data?.session ?? rRes?.session ?? null;
  }

  function openModal() {
    setErr(null);
    setOk(null);
    setOpen(true);
    setMsg((prev) => (prev?.trim() ? prev : computedDefaultMessage));
  }

  function closeModal() {
    setErr(null);
    setOpen(false);
  }

  async function onSend() {
    setErr(null);
    setOk(null);

    const body = msg.trim();
    if (!body) {
      setErr("Please type a message.");
      return;
    }

    if (isBadDynamicValue(refId)) {
      setErr("Invalid listing reference id.");
      return;
    }

    if (!vendorUserId) {
      setErr("Vendor information is missing for this listing.");
      return;
    }

    if (!isUuid(vendorUserId)) {
      setErr("This listing is not yet linked to a valid vendor account.");
      return;
    }

    let session: any = null;
    try {
      session = await getSessionSafe();
    } catch (e: any) {
      setErr(e?.message ?? "Auth error");
      return;
    }

    if (!session?.user?.id) {
      try {
        sessionStorage.setItem(draftKey(String(module), String(refId)), body);
      } catch {}

      const fallbackBack = modulePublicDetailPath(String(module), String(refId));
      const backCandidate = safePath(nextUrl) ?? fallbackBack;
      const back = isPlaceholderPath(backCandidate) ? fallbackBack : backCandidate;

      const redirectUrl = `/login?next=${encodeURIComponent(back)}&openEnquiry=1`;
      router.replace(redirectUrl);
      return;
    }

    setSending(true);

    try {
      const buyerId = String(session.user.id);

      if (String(buyerId) === String(vendorUserId ?? "")) {
        setErr("You cannot chat with yourself on your own listing.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/enquiries/create-and-chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          module,
          refId: String(refId),
          vendorUserId: String(vendorUserId),
          title: title ?? enquiryName,
          priceText: priceText ?? null,
          message: body,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error ?? "Failed to send enquiry.");
        setSending(false);
        return;
      }

      const conversationId = String(json?.conversationId ?? "").trim();
      const chatUrl = String(json?.chatUrl ?? "").trim();

      if (
        !conversationId ||
        isBadDynamicValue(conversationId) ||
        conversationId.includes("[") ||
        conversationId.includes("<")
      ) {
        setErr("Conversation was not created correctly.");
        setSending(false);
        return;
      }

      if (!chatUrl || isPlaceholderPath(chatUrl)) {
        setErr("Chat URL was not created correctly.");
        setSending(false);
        return;
      }

      setOk("✅ Enquiry sent and chat opened.");
      setOpen(false);
      setMsg(computedDefaultMessage);
      setSending(false);

      router.push(chatUrl);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to send enquiry.");
      setSending(false);
    }
  }

  return (
    <div>
      {ok ? <div className="toastOk">{ok}</div> : null}

      <button type="button" className="cta" onClick={openModal}>
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="panel" ref={panelRef}>
            <div className="panelTop">
              <div>
                <div className="panelTitle">Send enquiry</div>
                <div className="panelSub">
                  {String(module).toUpperCase()} • {enquiryName}
                </div>
              </div>

              <button className="xBtn" type="button" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {err ? <div className="alert alertErr">{err}</div> : null}

            <div className="meta">
              {title ? (
                <div className="metaRow">
                  <span className="metaK">Listing</span>
                  <span className="metaV">{title}</span>
                </div>
              ) : null}
              {priceText ? (
                <div className="metaRow">
                  <span className="metaK">Price</span>
                  <span className="metaV">{priceText}</span>
                </div>
              ) : null}
            </div>

            <label className="label">Message</label>
            <textarea
              ref={textareaRef}
              className="textarea"
              rows={5}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Write your message…"
            />

            <div className="actions">
              <button className="btnPrimary" type="button" onClick={onSend} disabled={sending}>
                {sending ? "Sending enquiry..." : "Send enquiry"}
              </button>

              <button className="btnGhost" type="button" onClick={closeModal} disabled={sending}>
                Cancel
              </button>
            </div>

            <div className="fine">
              Tip: You can browse without login. Login is required only when you click <b>Send enquiry</b>.
            </div>
          </div>

          <style jsx>{`
            .toastOk {
              margin-bottom: 10px;
              padding: 10px 12px;
              border-radius: 12px;
              border: 1px solid rgba(16, 185, 129, 0.22);
              background: rgba(16, 185, 129, 0.06);
              color: #065f46;
              font-weight: 900;
            }

            .cta {
              width: 100%;
              height: 44px;
              border-radius: 14px;
              border: 1px solid rgba(0, 0, 0, 0.1);
              background: linear-gradient(90deg, rgba(96, 165, 250, 0.96), rgba(167, 139, 250, 0.96));
              color: #071018;
              font-weight: 950;
              cursor: pointer;
              box-shadow: 0 12px 26px rgba(0, 0, 0, 0.12);
              transition: transform 0.08s ease, filter 0.2s ease;
            }
            .cta:active {
              transform: translateY(1px);
            }
            .cta:hover {
              filter: brightness(1.02);
            }

            .overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;
              display: grid;
              place-items: center;
              padding: 16px;
              background: rgba(2, 6, 23, 0.62);
              backdrop-filter: blur(10px);
              animation: fadeIn 0.12s ease-out both;
            }

            .panel {
              width: min(680px, 100%);
              border-radius: 18px;
              background: rgba(255, 255, 255, 0.08);
              border: 1px solid rgba(255, 255, 255, 0.14);
              box-shadow: 0 28px 90px rgba(0, 0, 0, 0.55);
              backdrop-filter: blur(18px);
              padding: 16px;
              color: #eaf0ff;
              transform-origin: 50% 60%;
              animation: popIn 0.14s ease-out both;
            }

            .panelTop {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 10px;
            }
            .panelTitle {
              font-size: 16px;
              font-weight: 950;
              letter-spacing: 0.2px;
            }
            .panelSub {
              margin-top: 4px;
              font-size: 12px;
              opacity: 0.75;
            }

            .xBtn {
              width: 38px;
              height: 38px;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.14);
              background: rgba(255, 255, 255, 0.06);
              color: #eaf0ff;
              cursor: pointer;
              font-weight: 900;
            }
            .xBtn:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
            }

            .alert {
              border-radius: 12px;
              padding: 10px 12px;
              margin: 8px 0 12px;
              font-size: 12px;
              line-height: 1.5;
              border: 1px solid rgba(255, 255, 255, 0.12);
            }
            .alertErr {
              background: rgba(239, 68, 68, 0.12);
              border-color: rgba(239, 68, 68, 0.22);
            }

            .meta {
              display: grid;
              gap: 8px;
              margin-bottom: 12px;
              padding: 10px 12px;
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .metaRow {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              font-size: 12px;
            }
            .metaK {
              opacity: 0.75;
              font-weight: 800;
            }
            .metaV {
              opacity: 0.95;
              font-weight: 900;
              text-align: right;
            }

            .label {
              display: block;
              margin: 6px 0 6px;
              font-size: 12px;
              font-weight: 950;
              opacity: 0.85;
            }
            .textarea {
              width: 100%;
              border-radius: 14px;
              border: 1px solid rgba(255, 255, 255, 0.14);
              background: rgba(255, 255, 255, 0.05);
              color: #eaf0ff;
              padding: 12px;
              resize: vertical;
              outline: none;
              line-height: 1.6;
            }
            .textarea::placeholder {
              color: rgba(234, 240, 255, 0.55);
            }
            .textarea:focus {
              border-color: rgba(96, 165, 250, 0.45);
              box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.12);
            }

            .actions {
              margin-top: 12px;
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
            }
            .btnPrimary {
              flex: 1;
              height: 44px;
              border: none;
              border-radius: 14px;
              background: linear-gradient(90deg, #60a5fa, #a78bfa);
              color: #071018;
              font-weight: 950;
              cursor: pointer;
              box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
            }
            .btnPrimary:disabled {
              opacity: 0.7;
              cursor: not-allowed;
              box-shadow: none;
            }
            .btnGhost {
              height: 44px;
              padding: 0 14px;
              border-radius: 14px;
              border: 1px solid rgba(255, 255, 255, 0.14);
              background: rgba(255, 255, 255, 0.06);
              color: #eaf0ff;
              font-weight: 950;
              cursor: pointer;
            }
            .btnGhost:disabled {
              opacity: 0.65;
              cursor: not-allowed;
            }

            .fine {
              margin-top: 10px;
              font-size: 12px;
              opacity: 0.75;
              line-height: 1.55;
            }

            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes popIn {
              from {
                opacity: 0;
                transform: translateY(8px) scale(0.985);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
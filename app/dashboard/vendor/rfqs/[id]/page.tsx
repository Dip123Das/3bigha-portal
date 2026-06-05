// app/dashboard/vendor/rfqs/[id]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";

type RFQRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;

  // ✅ NEW (API must return it)
  whatsapp: string | null;

  delivery_city: string | null;
  delivery_district: string | null;
  delivery_pincode: string | null;
  status: string | null;
  created_at: string | null;
};

function safeText(x: any) {
  return String(x ?? "").trim();
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function normalizePhone(raw: string) {
  // Keep digits only. If 10 digits, assume India +91.
  const d = safeText(raw).replace(/[^\d]/g, "");
  if (d.length === 10) return { e164: `+91${d}`, digits: d };
  if (d.startsWith("91") && d.length === 12) return { e164: `+${d}`, digits: d.slice(2) };
  if (d.length >= 11 && d.startsWith("0")) return { e164: `+91${d.slice(1)}`, digits: d.slice(1) };
  return { e164: d ? (d.startsWith("+") ? d : `+${d}`) : "", digits: d };
}

function encodeMsg(s: string) {
  return encodeURIComponent(s);
}

export default function VendorRFQDetailsPage() {
  const params = useParams<{ id: string }>();
  const rfqId = String((params as any)?.id ?? "").trim();

  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const [row, setRow] = useState<RFQRow | null>(null);
  const [meta, setMeta] = useState<any>(null);

  const loginHref = `/login?next=${encodeURIComponent(`/dashboard/vendor/rfqs/${rfqId}`)}`;

  async function load() {
    setLoading(true);
    setErr(null);
    setNeedsLogin(false);
    setRow(null);
    setMeta(null);

    if (!rfqId) {
      setErr("Missing RFQ id in URL.");
      setLoading(false);
      return;
    }

    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      setErr(sErr.message);
      setLoading(false);
      return;
    }

    const session = s.session;
    if (!session) {
      setNeedsLogin(true);
      setErr("Not logged in. Please login as vendor.");
      setLoading(false);
      return;
    }

    const resp = await fetch(`/api/vendor/rfqs/${encodeURIComponent(rfqId)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      setErr(json?.error || "RFQ not found.");
      setLoading(false);
      return;
    }

    setRow((json?.row ?? null) as RFQRow | null);
    setMeta(json?.meta ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId]);

  const buyerName = safeText(row?.name) || "Customer";

  const buyerPhoneRaw = safeText(row?.phone);
  const buyerEmail = safeText(row?.email);

  // ✅ WhatsApp priority: use whatsapp if present else fallback to phone
  const buyerWhatsAppRaw = safeText((row as any)?.whatsapp);
  const waSource = buyerWhatsAppRaw || buyerPhoneRaw;

  const { digits: buyerPhoneDigits } = normalizePhone(buyerPhoneRaw);
  const { digits: buyerWhatsAppDigits } = normalizePhone(waSource);

  const locationText = [safeText(row?.delivery_city), safeText(row?.delivery_district), safeText(row?.delivery_pincode)]
    .filter(Boolean)
    .join(", ");

  // Quick AI-style templates (you can edit any text here)
  const quickMsgs = [
    {
      label: "Send quotation",
      text: `Hi ${buyerName}, I am a vendor on 3Bigha. I can supply materials for your RFQ (${rfqId}). Please share item list/brand/quantity and delivery time so I can send best quotation.`,
    },
    {
      label: "Ask for details",
      text: `Hi ${buyerName}, regarding your RFQ (${rfqId}), I need a few details: exact brands/grade, delivery address, and required delivery date. Please confirm.`,
    },
    {
      label: "Share best rate",
      text: `Hi ${buyerName}, I can offer best market price for your RFQ (${rfqId}). Please confirm quantities and delivery location so I can finalize the rate.`,
    },
    {
      label: "Ready for delivery",
      text: `Hi ${buyerName}, materials for RFQ (${rfqId}) are available. I can deliver quickly in ${safeText(row?.delivery_city) || "your area"}. Shall I call you for confirmation?`,
    },
  ];

  // Build links
  const telHref = buyerPhoneDigits ? `tel:${buyerPhoneDigits}` : "";

  const waHref = buyerWhatsAppDigits
    ? `https://wa.me/${buyerWhatsAppDigits}?text=${encodeMsg(
        `Hi ${buyerName}, I am a vendor on 3Bigha regarding your RFQ (${rfqId}).`
      )}`
    : "";

  const mailHref = buyerEmail
    ? `mailto:${buyerEmail}?subject=${encodeMsg(`3Bigha RFQ (${rfqId}) - Vendor Contact`)}&body=${encodeMsg(
        `Hi ${buyerName},\n\nI am a vendor on 3Bigha. I’m contacting you regarding your RFQ (${rfqId}).\n\nPlease share item list/brand/quantity and delivery time.\n\nThanks,\n`
      )}`
    : "";

  function openWhatsAppWithMessage(message: string) {
    if (!buyerWhatsAppDigits) return;
    const url = `https://wa.me/${buyerWhatsAppDigits}?text=${encodeMsg(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openEmailWithMessage(message: string) {
    if (!buyerEmail) return;
    const url = `mailto:${buyerEmail}?subject=${encodeMsg(`3Bigha RFQ (${rfqId})`)}&body=${encodeMsg(message)}`;
    window.location.href = url;
  }

  function copyToClipboard(text: string) {
    try {
      navigator.clipboard.writeText(text);
      alert("Message copied. Paste it in SMS/WhatsApp.");
    } catch {
      alert("Copy failed. Please select and copy manually.");
    }
  }

  const showContactBlock = Boolean(buyerPhoneDigits || buyerEmail || buyerWhatsAppDigits);

  return (
    <Container>
      <SectionHeader title="RFQ Details" subtitle="Buyer requirement overview" />

      <div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/dashboard/vendor/rfqs" className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
          ← Back to RFQs
        </Link>

        {needsLogin ? (
          <ActionButton href={loginHref} variant="primary">
            Login →
          </ActionButton>
        ) : (
          <button
            type="button"
            onClick={() => load()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <EmptyState message="Preparing buyer requirement…" />
      ) : err ? (
        <EmptyState message={err} />
      ) : !row ? (
        <EmptyState message="RFQ not found." />
      ) : (
        <Card>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 18 }}>{buyerName}</div>

                <div style={{ marginTop: 6, opacity: 0.85 }}>📍 {locationText || "Location not specified"}</div>

                <div style={{ marginTop: 6, opacity: 0.85 }}>🕒 {fmtDate(row.created_at)}</div>

                {/* Buyer Contact Details + Rapido-style toggles */}
                {showContactBlock ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Buyer Contact Details</div>

                    {buyerPhoneDigits ? (
                      <div style={{ opacity: 0.9, marginBottom: 6 }}>Phone: {buyerPhoneRaw || buyerPhoneDigits}</div>
                    ) : (
                      <div style={{ opacity: 0.7, marginBottom: 6 }}>Phone: —</div>
                    )}

                    {/* ✅ Show WhatsApp explicitly if present, else show fallback info */}
                    {buyerWhatsAppDigits ? (
                      <div style={{ opacity: 0.9, marginBottom: 10 }}>
                        WhatsApp: {buyerWhatsAppRaw ? buyerWhatsAppRaw : buyerPhoneRaw || buyerWhatsAppDigits}
                        {buyerWhatsAppRaw ? null : (
                          <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>(same as phone)</span>
                        )}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.7, marginBottom: 10 }}>WhatsApp: —</div>
                    )}

                    {buyerEmail ? (
                      <div style={{ opacity: 0.9, marginBottom: 10 }}>Email: {buyerEmail}</div>
                    ) : (
                      <div style={{ opacity: 0.7, marginBottom: 10 }}>Email: —</div>
                    )}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {/* CALL */}
                      {buyerPhoneDigits ? (
                        <a href={telHref} className="topBtn topBtnPrimary" style={{ textDecoration: "none" }}>
                          📞 Call
                        </a>
                      ) : (
                        <span className="topBtn topBtnGhost" style={{ opacity: 0.5 }}>
                          📞 Call (no phone)
                        </span>
                      )}

                      {/* WHATSAPP */}
                      {buyerWhatsAppDigits ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="topBtn topBtnGhost"
                          style={{ textDecoration: "none" }}
                        >
                          💬 WhatsApp
                        </a>
                      ) : (
                        <span className="topBtn topBtnGhost" style={{ opacity: 0.5 }}>
                          💬 WhatsApp (not provided)
                        </span>
                      )}

                      {/* EMAIL */}
                      {buyerEmail ? (
                        <a href={mailHref} className="topBtn topBtnGhost" style={{ textDecoration: "none" }}>
                          ✉️ Email
                        </a>
                      ) : (
                        <span className="topBtn topBtnGhost" style={{ opacity: 0.5 }}>
                          ✉️ Email (no email)
                        </span>
                      )}
                    </div>

                    {/* AI Message Chips */}
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontWeight: 800, marginBottom: 8 }}>
                        Quick Response Messages
                        <span style={{ fontWeight: 600, opacity: 0.6, marginLeft: 8, fontSize: 12 }}>
                          (tap to quickly contact buyer)
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {quickMsgs.map((m) => (
                          <button
                            key={m.label}
                            type="button"
                            className="topBtn topBtnGhost"
                            onClick={() => {
                              // Prefer WhatsApp if available, else email, else copy
                              if (buyerWhatsAppDigits) openWhatsAppWithMessage(m.text);
                              else if (buyerEmail) openEmailWithMessage(m.text);
                              else copyToClipboard(m.text);
                            }}
                            style={{ cursor: "pointer" }}
                            title={m.text}
                          >
                            🤖 {m.label}
                          </button>
                        ))}

                        <button
                          type="button"
                          className="topBtn topBtnGhost"
                          onClick={() =>
                            copyToClipboard(`Hi ${buyerName}, I am a vendor on 3Bigha regarding your RFQ (${rfqId}).`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          📋 Copy message
                        </button>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                        Note: Direct SMS prefill is limited on desktop browsers. WhatsApp + Call will work best.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,0.1)", opacity: 0.7 }}>
                    Buyer contact details are not available yet.
                  </div>
                )}

                {meta?.filtered_by ? (
                  <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
                    Filtered by:{" "}
                    {Object.entries(meta.filtered_by)
                      .filter(([, v]) => String(v ?? "").trim())
                      .map(([k, v]) => `${k}=${v}`)
                      .join(" • ")}
                  </div>
                ) : null}

                <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                  RFQ ID:{" "}
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                    {row.id}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900, opacity: 0.75 }}>{row.status ?? "open"}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </Container>
  );
}
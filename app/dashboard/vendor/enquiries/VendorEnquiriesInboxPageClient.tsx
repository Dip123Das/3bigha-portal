"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

type EnquiryStatus = "new" | "contacted" | "closed" | "spam" | string;
type SenderRole = "buyer" | "vendor" | string;
type LeadScore = "hot" | "medium" | "low";

type EnquiryRow = {
  id: string;
  buyer_user_id: string;
  vendor_user_id: string;

  subject_type: string;
  subject_id: string | null;

  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;

  message: string;
  status: EnquiryStatus;

  vendor_notes: string | null;

  created_at: string;
};

type EnquiryMessageRow = {
  id: string;
  enquiry_id: string;
  sender_user_id: string;
  sender_role: SenderRole;
  body: string;
  created_at: string;
};

type ConversationLite = {
  id: string;
  context_type: string | null;
  context_id: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  is_closed?: boolean | null;
};

// ✅ Switch here if your final table names differ
const INQUIRIES_TABLE = "inquiries";
const MESSAGES_TABLE = "inquiry_messages";

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function clip(s: string, n = 120) {
  const t = (s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function titleCase(s: string) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t.length ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

function StatusPill({ status }: { status: EnquiryStatus }) {
  const s = (status ?? "new").toLowerCase();
  if (s === "new") return <Pill tone="warn">new</Pill>;
  if (s === "contacted") return <Pill>contacted</Pill>;
  if (s === "closed") return <Pill tone="ok">closed</Pill>;
  if (s === "spam") return <Pill>spam</Pill>;
  return <Pill>{s}</Pill>;
}

function LeadScorePill({ score }: { score?: LeadScore }) {
  if (score === "hot") return <Pill tone="warn">🔥 Hot Lead</Pill>;
  if (score === "low") return <Pill>❄️ Low Intent</Pill>;
  if (score === "medium") return <Pill tone="ok">🟡 Medium Intent</Pill>;
  return <Pill>🤖 Scoring…</Pill>;
}

const STATUS_OPTIONS: EnquiryStatus[] = ["new", "contacted", "closed", "spam"];

export default function VendorEnquiriesInboxPageClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [items, setItems] = useState<EnquiryRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<EnquiryStatus | "all">("all");
  const [filterSubject, setFilterSubject] = useState<string | "all">("all");
  const [q, setQ] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const [threadLoading, setThreadLoading] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);
  const [thread, setThread] = useState<EnquiryMessageRow[]>([]);
  const [replyBody, setReplyBody] = useState("");

  const [conversationMap, setConversationMap] = useState<Record<string, string>>({});
  const [leadScores, setLeadScores] = useState<Record<string, LeadScore>>({});

  const isDev = process.env.NODE_ENV !== "production";

  function enquiryToConversationKey(e: {
    buyer_user_id: string | null;
    subject_type: string | null;
    subject_id: string | null;
  }) {
    return [
      String(e.buyer_user_id ?? ""),
      String(e.subject_type ?? "").toLowerCase(),
      String(e.subject_id ?? ""),
    ].join("|");
  }

  function conversationToComparableSubjectType(contextType: string | null) {
    const ct = String(contextType ?? "").trim().toLowerCase();
    if (ct === "property_inquiry") return "property";
    if (ct === "service_inquiry") return "service";
    if (ct === "rental_inquiry") return "rental";
    if (ct === "listing") return "material";
    if (ct === "rfq") return "other";
    return ct;
  }

  async function requireSession() {
    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) throw new Error(sErr.message);
    const session = s.session;
    if (!session) {
      router.replace("/login?next=/dashboard/vendor/enquiries");
      return null;
    }
    return session;
  }

  async function loadConversationMap(vendorUserId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,context_type,context_id,buyer_user_id,vendor_user_id,is_closed,updated_at")
      .eq("vendor_user_id", vendorUserId)
      .eq("is_closed", false)
      .order("updated_at", { ascending: false })
      .limit(300);

    if (error) return;

    const rows = (data ?? []) as ConversationLite[];
    const next: Record<string, string> = {};

    for (const c of rows) {
      const key = [
        String(c.buyer_user_id ?? ""),
        conversationToComparableSubjectType(c.context_type),
        String(c.context_id ?? ""),
      ].join("|");

      if (key && c.id) next[key] = String(c.id);
    }

    setConversationMap(next);
  }

  async function loadList() {
    setListLoading(true);
    setListErr(null);

    const session = await requireSession();
    if (!session) {
      setListLoading(false);
      return;
    }

    let query = supabase
      .from(INQUIRIES_TABLE)
      .select(
        "id,buyer_user_id,vendor_user_id,subject_type,subject_id,buyer_name,buyer_phone,buyer_email,message,status,vendor_notes,created_at"
      )
      .eq("vendor_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterSubject !== "all") query = query.eq("subject_type", filterSubject);

    const { data, error } = await query;
    if (error) {
      setListErr(error.message);
      setItems([]);
      setListLoading(false);
      return;
    }

    let rows = (data ?? []) as EnquiryRow[];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((r) => {
        const hay = [
          r.message,
          r.buyer_name ?? "",
          r.buyer_phone ?? "",
          r.buyer_email ?? "",
          r.subject_type ?? "",
          r.subject_id ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    setItems(rows);
    setListLoading(false);
  }

  async function loadThread(enquiryId: string) {
    setThreadLoading(true);
    setThreadErr(null);

    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select("id,enquiry_id,sender_user_id,sender_role,body,created_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: true });

    if (error) {
      setThreadErr(error.message);
      setThread([]);
      setThreadLoading(false);
      return;
    }

    setThread((data ?? []) as EnquiryMessageRow[]);
    setThreadLoading(false);
  }

  async function init() {
    setLoading(true);
    setErr(null);

    try {
      const session = await requireSession();
      if (!session) return;

      setEmail(session.user.email ?? null);
      setUserId(session.user.id);

      const { data: bp, error: bpErr } = await supabase
        .from("business_profiles")
        .select("user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (bpErr) throw new Error(bpErr.message);
      if (!bp?.user_id) {
        router.replace("/dashboard/vendor");
        return;
      }

      setLoading(false);
      await Promise.all([
        loadList(),
        loadConversationMap(session.user.id),
      ]);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
      setLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterSubject]);

  useEffect(() => {
    if (!focusId) {
      setThread([]);
      setThreadErr(null);
      setReplyBody("");
      return;
    }
    loadThread(focusId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

    useEffect(() => {
    const rowsToScore = items.filter((item) => !leadScores[item.id]).slice(0, 10);

    if (!rowsToScore.length) return;

    let cancelled = false;

    async function scoreRows() {
      for (const item of rowsToScore) {
        try {
          const res = await fetch("/api/ai/lead-score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: item.message }),
          });

          const json = await res.json().catch(() => null);
          const score = String(json?.score || "medium").toLowerCase() as LeadScore;

          if (!cancelled) {
            setLeadScores((prev) => ({
              ...prev,
              [item.id]: score === "hot" || score === "low" ? score : "medium",
            }));
          }
        } catch {
          if (!cancelled) {
            setLeadScores((prev) => ({
              ...prev,
              [item.id]: "medium",
            }));
          }
        }
      }
    }

    scoreRows();

    return () => {
      cancelled = true;
    };
  }, [items, leadScores]);

  async function updateStatus(id: string, status: EnquiryStatus) {
    setUpdatingId(id);
    setListErr(null);

    const { error } = await supabase.from(INQUIRIES_TABLE).update({ status }).eq("id", id);

    setUpdatingId(null);

    if (error) {
      setListErr(error.message);
      return;
    }

    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  async function saveNote(id: string) {
    const text = (noteDraft[id] ?? "").trim();
    setUpdatingId(id);
    setListErr(null);

    const { error } = await supabase
      .from(INQUIRIES_TABLE)
      .update({ vendor_notes: text.length ? text : null })
      .eq("id", id);

    setUpdatingId(null);

    if (error) {
      setListErr(error.message);
      return;
    }

    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, vendor_notes: text.length ? text : null } : x))
    );
  }

  async function sendVendorReply(enquiryId: string) {
    const body = replyBody.trim();
    if (!body) return;

    if (!userId) {
      setThreadErr("No user session.");
      return;
    }

    setUpdatingId(enquiryId);
    setThreadErr(null);

    const payload = {
      enquiry_id: enquiryId,
      sender_user_id: userId,
      sender_role: "vendor" as SenderRole,
      body,
    };

    const { error } = await supabase.from(MESSAGES_TABLE).insert(payload);

    setUpdatingId(null);

    if (error) {
      setThreadErr(error.message);
      return;
    }

    setReplyBody("");
    await loadThread(enquiryId);
  }

  async function createTestEnquiry() {
    const session = await requireSession();
    if (!session) return;

    const payload = {
      buyer_user_id: session.user.id,
      vendor_user_id: session.user.id,
      subject_type: "service",
      subject_id: null,
      buyer_name: "Test Buyer",
      buyer_phone: "9999999999",
      buyer_email: session.user.email ?? null,
      message: `Test enquiry created at ${new Date().toLocaleString()} (for UI testing).`,
      status: "new" as EnquiryStatus,
    };

    const { error } = await supabase.from(INQUIRIES_TABLE).insert(payload);
    if (error) {
      setListErr(error.message);
      return;
    }

    await loadList();
  }

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Enquiries Inbox" subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Preparing inbox…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="Enquiries Inbox" subtitle="" />
          <EmptyState message="Could not load enquiries inbox." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard/vendor" variant="secondary">
              ← Back to Vendor Dashboard
            </ActionButton>
          </div>
        </Container>
      </main>
    );
  }

  const focused = focusId ? items.find((x) => x.id === focusId) : null;
  const focusedConversationId = focused
    ? conversationMap[enquiryToConversationKey(focused)]
    : null;

  return (
    <main>
      <Container>
        <SectionHeader title="Enquiries Inbox" subtitle="View, filter, and reply to buyer enquiries." />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard/vendor" variant="secondary">
            ← Vendor Dashboard
          </ActionButton>

          <button
            type="button"
            onClick={() => loadList()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          {isDev ? (
            <button
              type="button"
              onClick={() => createTestEnquiry()}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Creates a test enquiry addressed to your own vendor account (safe for UI testing)."
            >
              + Create test enquiry
            </button>
          ) : null}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge>{email ?? "—"}</Badge>
            <Pill>{items.length}</Pill>
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Filters</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Status</div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  style={{ height: 40, borderRadius: 12, padding: "0 12px", border: "1px solid rgba(0,0,0,0.12)" }}
                >
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(String(s))}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Subject</div>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value as any)}
                  style={{ height: 40, borderRadius: 12, padding: "0 12px", border: "1px solid rgba(0,0,0,0.12)" }}
                >
                  <option value="all">All</option>
                  <option value="property">Property</option>
                  <option value="material">Material</option>
                  <option value="service">Service</option>
                  <option value="rental">Rental</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ flex: "1 1 260px", minWidth: 220 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Search</div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search message / buyer name / phone / email..."
                  style={{ height: 40, width: "100%", borderRadius: 12, padding: "0 12px", border: "1px solid rgba(0,0,0,0.12)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => loadList()}
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
                  Apply
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        {focused ? (
          <div style={{ marginTop: 12 }}>
            <Card>
              <CardBody>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Focused Enquiry</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <Pill>{titleCase(focused.subject_type)}</Pill>
                      <StatusPill status={focused.status} />
                      <LeadScorePill score={leadScores[focused.id]} />
                      <Pill>{fmtDateTime(focused.created_at)}</Pill>
                      <Pill>id: {focused.id.slice(0, 8)}…</Pill>
                    </div>
                    <div style={{ fontWeight: 900, marginBottom: 4 }}>
                      {focused.buyer_name?.trim() ? focused.buyer_name : "Buyer"}
                    </div>
                    <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>{focused.message}</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {focused.buyer_phone ? <Pill>{focused.buyer_phone}</Pill> : null}
                      {focused.buyer_email ? <Pill>{focused.buyer_email}</Pill> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {focusedConversationId ? (
                      <ActionButton
                        href={`/dashboard/vendor/chat/${encodeURIComponent(focusedConversationId)}`}
                        variant="primary"
                      >
                        Open Live Chat →
                      </ActionButton>
                    ) : null}

                    <select
                      value={(focused.status ?? "new").toLowerCase()}
                      onChange={(ev) => updateStatus(focused.id, ev.target.value)}
                      disabled={updatingId === focused.id}
                      style={{
                        height: 40,
                        borderRadius: 12,
                        padding: "0 10px",
                        border: "1px solid rgba(0,0,0,0.12)",
                        fontWeight: 900,
                      }}
                      title="Update enquiry status"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {titleCase(String(s))}
                        </option>
                      ))}
                    </select>

                    <ActionButton href="/dashboard/vendor/enquiries" variant="secondary">
                      Clear focus
                    </ActionButton>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Conversation</div>

                  {threadErr ? (
                    <div style={{ marginBottom: 10, color: "crimson", fontWeight: 800 }}>{threadErr}</div>
                  ) : null}

                  {threadLoading ? (
                    <div style={{ opacity: 0.8 }}>Loading messages…</div>
                  ) : thread.length === 0 ? (
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      No replies yet. Send the first reply from below.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {thread.map((m) => {
                        const isMine = (m.sender_role ?? "").toLowerCase() === "vendor";
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: "flex",
                              justifyContent: isMine ? "flex-end" : "flex-start",
                            }}
                          >
                            <div
                              style={{
                                maxWidth: 760,
                                borderRadius: 14,
                                padding: 12,
                                border: "1px solid rgba(0,0,0,0.08)",
                                background: "white",
                              }}
                            >
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                <Pill tone={isMine ? "ok" : "neutral"}>{isMine ? "Vendor" : "Buyer"}</Pill>
                                <Pill>{fmtDateTime(m.created_at)}</Pill>
                              </div>
                              <div style={{ fontSize: 13, lineHeight: 1.6, color: "#111827" }}>{m.body}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>
                      Reply as Vendor
                    </div>
                    <textarea
                      rows={3}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply to the buyer…"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        padding: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => sendVendorReply(focused.id)}
                        disabled={updatingId === focused.id || replyBody.trim().length === 0}
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
                        Send reply
                      </button>

                      <button
                        type="button"
                        onClick={() => loadThread(focused.id)}
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
                        Refresh thread
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Vendor Notes (private)</div>
                  <textarea
                    rows={2}
                    value={noteDraft[focused.id] ?? focused.vendor_notes ?? ""}
                    onChange={(ev) => setNoteDraft((p) => ({ ...p, [focused.id]: ev.target.value }))}
                    placeholder="Add internal notes (only you can see)…"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => saveNote(focused.id)}
                      disabled={updatingId === focused.id}
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
                      Save notes
                    </button>

                    {focused.vendor_notes ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNoteDraft((p) => ({ ...p, [focused.id]: "" }));
                          saveNote(focused.id);
                        }}
                        disabled={updatingId === focused.id}
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
                        Clear notes
                      </button>
                    ) : null}
                  </div>
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                  <Link href={`/dashboard/vendor/enquiries?focus=${encodeURIComponent(focused.id)}`} style={{ fontWeight: 900 }}>
                    Permalink →
                  </Link>
                  <span style={{ marginLeft: "auto", color: "#5b6472", fontSize: 13 }}>
                    Buyer Inbox uses the same thread.
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          {listErr ? (
            <div style={{ marginBottom: 10, color: "crimson", fontWeight: 800 }}>{listErr}</div>
          ) : null}

          {listLoading ? (
            <div style={{ opacity: 0.8 }}>Loading enquiries…</div>
          ) : items.length === 0 ? (
            <EmptyState message="No enquiries found for the current filters." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((e) => {
                const liveConversationId = conversationMap[enquiryToConversationKey(e)] ?? null;

                return (
                  <Card key={e.id}>
                    <CardBody>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                            <Pill>{titleCase(e.subject_type)}</Pill>
                            <StatusPill status={e.status} />
                            <LeadScorePill score={leadScores[e.id]} />
                            <Pill>{fmtDateTime(e.created_at)}</Pill>
                            <Pill>id: {e.id.slice(0, 8)}…</Pill>
                          </div>

                          <div style={{ fontWeight: 900, marginBottom: 4 }}>
                            {e.buyer_name?.trim() ? e.buyer_name : "Buyer"}
                          </div>

                          <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                            {clip(e.message, 180)}
                          </div>

                          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {e.buyer_phone ? <Pill>{e.buyer_phone}</Pill> : null}
                            {e.buyer_email ? <Pill>{e.buyer_email}</Pill> : null}
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          <ActionButton
                            href={`/dashboard/vendor/enquiries?focus=${encodeURIComponent(e.id)}`}
                            variant="secondary"
                          >
                            Open
                          </ActionButton>

                          {liveConversationId ? (
                            <ActionButton
                              href={`/dashboard/vendor/chat/${encodeURIComponent(liveConversationId)}`}
                              variant="primary"
                            >
                              Live Chat
                            </ActionButton>
                          ) : null}

                          <select
                            value={(e.status ?? "new").toLowerCase()}
                            onChange={(ev) => updateStatus(e.id, ev.target.value)}
                            disabled={updatingId === e.id}
                            style={{
                              height: 40,
                              borderRadius: 12,
                              padding: "0 10px",
                              border: "1px solid rgba(0,0,0,0.12)",
                              fontWeight: 900,
                            }}
                            title="Update enquiry status"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {titleCase(String(s))}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </CardBody>

                    <CardFooter>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                        <Link href={`/dashboard/vendor/enquiries?focus=${encodeURIComponent(e.id)}`} style={{ fontWeight: 900 }}>
                          Open thread →
                        </Link>
                        <span style={{ marginLeft: "auto", color: "#5b6472", fontSize: 13 }}>
                          Reply + notes are inside the thread view.
                        </span>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Uses unified inbox: <b>{INQUIRIES_TABLE}</b> + <b>{MESSAGES_TABLE}</b>.
        </div>
      </Container>
    </main>
  );
}
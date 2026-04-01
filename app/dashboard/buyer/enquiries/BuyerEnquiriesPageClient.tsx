// app/dashboard/buyer/enquiries/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { requireBrowserSession } from "@/lib/requireBrowserSession";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

type EnquiryStatus = "new" | "contacted" | "closed" | "spam" | string;
type SenderRole = "buyer" | "vendor" | "admin" | string;

type EnquiryRow = {
  id: string;

  // New messaging columns
  buyer_user_id: string | null;
  vendor_user_id: string | null;

  subject_type: string | null;
  subject_id: string | null;

  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;

  status: EnquiryStatus | null;

  created_at: string;
  updated_at: string | null;
  last_message_at: string | null;

  // Legacy columns (kept for compatibility; not required)
  module: string | null;
  ref_id: any;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  assigned_user_id: string | null;
};

type EnquiryMessageRow = {
  id: string;
  enquiry_id: string;
  sender_user_id: string | null;
  sender_role: SenderRole;
  body: string;
  created_at: string;
};

const INQUIRIES_TABLE = "inquiries";
const MESSAGES_TABLE = "inquiry_messages";

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function clip(s: string | null | undefined, n = 120) {
  const t = (s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function titleCase(s: string | null | undefined) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t.length ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
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

function StatusPill({ status }: { status: EnquiryStatus | null }) {
  const s = (status ?? "new").toLowerCase();
  if (s === "new") return <Pill tone="warn">new</Pill>;
  if (s === "contacted") return <Pill>contacted</Pill>;
  if (s === "closed") return <Pill tone="ok">closed</Pill>;
  if (s === "spam") return <Pill>spam</Pill>;
  return <Pill>{s}</Pill>;
}

const STATUS_FILTERS: Array<{ key: "all" | EnquiryStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "closed", label: "Closed" },
  { key: "spam", label: "Spam" },
];

function isJwtError(msg: string) {
  return /jwt expired|invalid jwt|expired/i.test(msg ?? "");
}

function BuyerEnquiriesPageInner() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // List
  const [items, setItems] = useState<EnquiryRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<EnquiryStatus | "all">("all");
  const [filterSubject, setFilterSubject] = useState<string | "all">("all");
  const [q, setQ] = useState("");

  // Thread
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);
  const [thread, setThread] = useState<EnquiryMessageRow[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  async function getSessionOrRedirect() {
    return requireBrowserSession({
      supabase,
      router,
      nextUrl: "/dashboard/buyer/enquiries",
    });
  }

  async function runWithJwtRetry<T>(fn: () => Promise<{ data: T | null; error: any }>) {
    let res = await fn();
    if (res.error && isJwtError(res.error.message)) {
      const rRes: any = await supabase.auth.refreshSession();
      if (!rRes?.error) {
        res = await fn();
      }
    }
    return res;
  }

  async function loadList() {
    setListLoading(true);
    setListErr(null);

    const session = await getSessionOrRedirect();
    if (!session) {
      setListLoading(false);
      return;
    }

    setEmail(session.user.email ?? null);
    setUserId(session.user.id);

    // ✅ Buyer’s inbox is tied to buyer_user_id now (BEST)
    let query = supabase
      .from(INQUIRIES_TABLE)
      .select(
        [
          "id",
          "buyer_user_id",
          "vendor_user_id",
          "subject_type",
          "subject_id",
          "buyer_name",
          "buyer_phone",
          "buyer_email",
          "status",
          "created_at",
          "updated_at",
          "last_message_at",
        ].join(",")
      )
      .eq("buyer_user_id", session.user.id)
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterSubject !== "all") query = query.eq("subject_type", filterSubject);

    const { data, error } = await runWithJwtRetry<EnquiryRow[]>(() => query as any);

    if (error) {
      setListErr(error.message ?? String(error));
      setItems([]);
      setListLoading(false);
      return;
    }

    let rows = (data ?? []) as EnquiryRow[];

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rows = rows.filter((r) => {
        const hay = [
          r.subject_type ?? "",
          r.subject_id ?? "",
          r.vendor_user_id ?? "",
          r.status ?? "",
          r.buyer_email ?? "",
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

    const session = await getSessionOrRedirect();
    if (!session) {
      setThreadLoading(false);
      return;
    }

    const query = supabase
      .from(MESSAGES_TABLE)
      .select("id,enquiry_id,sender_user_id,sender_role,body,created_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: true });

    const { data, error } = await runWithJwtRetry<EnquiryMessageRow[]>(() => query as any);

    if (error) {
      setThreadErr(error.message ?? String(error));
      setThread([]);
      setThreadLoading(false);
      return;
    }

    setThread((data ?? []) as EnquiryMessageRow[]);
    setThreadLoading(false);
  }

  async function sendBuyerReply(enquiryId: string) {
    const body = replyBody.trim();
    if (!body) return;

    const session = await getSessionOrRedirect();
    if (!session) return;

    setSending(true);
    setThreadErr(null);

    const payload = {
      enquiry_id: enquiryId,
      sender_user_id: session.user.id,
      sender_role: "buyer" as SenderRole,
      body,
    };

    const insertOp = () => supabase.from(MESSAGES_TABLE).insert(payload) as any;
    const { error } = await runWithJwtRetry<any>(insertOp);

    setSending(false);

    if (error) {
      setThreadErr(error.message ?? String(error));
      return;
    }

    setReplyBody("");
    await loadThread(enquiryId);
    await loadList(); // update ordering (last_message_at)
  }

  async function init() {
    setLoading(true);
    setErr(null);

    try {
      const session = await getSessionOrRedirect();
      if (!session) return;

      setEmail(session.user.email ?? null);
      setUserId(session.user.id);

      setLoading(false);
      await loadList();
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

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="My Enquiries" subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Preparing your inbox…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title="My Enquiries" subtitle="" />
          <EmptyState message="Could not load your enquiries." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← Back to Dashboard
            </ActionButton>
          </div>
        </Container>
      </main>
    );
  }

  const focused = focusId ? items.find((x) => x.id === focusId) : null;

  return (
    <main>
      <Container>
        <SectionHeader
          title="My Enquiries"
          subtitle="Track your enquiries and continue the conversation with vendors."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← Dashboard
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

          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge>{email ?? "—"}</Badge>
            <Pill>{items.length}</Pill>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Filters</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Status</div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                >
                  {STATUS_FILTERS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>Subject</div>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value as any)}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
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
                  placeholder="Search by message / vendor id / subject…"
                  style={{
                    height: 40,
                    width: "100%",
                    borderRadius: 12,
                    padding: "0 12px",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
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

        {/* Focus + Thread */}
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
                      <Pill>{fmtDateTime(focused.last_message_at ?? focused.created_at)}</Pill>
                      <Pill>id: {focused.id.slice(0, 8)}…</Pill>
                      {focused.vendor_user_id ? <Pill>vendor: {focused.vendor_user_id.slice(0, 8)}…</Pill> : null}
                      {focused.subject_id ? <Pill>ref: {focused.subject_id}</Pill> : null}
                    </div>

                    <div style={{ fontWeight: 900, marginBottom: 4 }}>Conversation</div>

                    {threadErr ? (
                      <div style={{ marginBottom: 10, color: "crimson", fontWeight: 800 }}>{threadErr}</div>
                    ) : null}

                    {threadLoading ? (
                      <div style={{ opacity: 0.8 }}>Loading messages…</div>
                    ) : thread.length === 0 ? (
                      <div style={{ color: "#5b6472", fontSize: 13 }}>
                        No messages yet. Send a follow-up below.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                        {thread.map((m) => {
                          const role = (m.sender_role ?? "").toLowerCase();
                          const isMine = role === "buyer";
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
                                  <Pill tone={isMine ? "ok" : "neutral"}>{isMine ? "You" : titleCase(role)}</Pill>
                                  <Pill>{fmtDateTime(m.created_at)}</Pill>
                                </div>
                                <div style={{ fontSize: 13, lineHeight: 1.6, color: "#111827" }}>{m.body}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Reply */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7, marginBottom: 6 }}>
                        Send a follow-up
                      </div>
                      <textarea
                        rows={3}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Type your follow-up message…"
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
                          onClick={() => sendBuyerReply(focused.id)}
                          disabled={sending || replyBody.trim().length === 0}
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
                          {sending ? "Sending…" : "Send message"}
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

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <ActionButton href="/dashboard/buyer/enquiries" variant="secondary">
                      Clear focus
                    </ActionButton>
                  </div>
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                  <Link
                    href={`/dashboard/buyer/enquiries?focus=${encodeURIComponent(focused.id)}`}
                    style={{ fontWeight: 900 }}
                  >
                    Permalink →
                  </Link>
                  <span style={{ marginLeft: "auto", color: "#5b6472", fontSize: 13 }}>
                    Uses messaging tables: {INQUIRIES_TABLE} + {MESSAGES_TABLE}
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {/* List */}
        <div style={{ marginTop: 12 }}>
          {listErr ? <div style={{ marginBottom: 10, color: "crimson", fontWeight: 800 }}>{listErr}</div> : null}

          {listLoading ? (
            <div style={{ opacity: 0.8 }}>Loading enquiries…</div>
          ) : items.length === 0 ? (
            <EmptyState message="You have not sent any enquiries yet." />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((e) => (
                <Card key={e.id}>
                  <CardBody>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <Pill>{titleCase(e.subject_type)}</Pill>
                          <StatusPill status={e.status} />
                          <Pill>{fmtDateTime(e.last_message_at ?? e.created_at)}</Pill>
                          {e.vendor_user_id ? <Pill>vendor: {e.vendor_user_id.slice(0, 8)}…</Pill> : null}
                        </div>

                        <div style={{ fontWeight: 900, marginBottom: 4 }}>Latest activity</div>

                        <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                          ref: {e.subject_id ?? "—"}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <ActionButton
                          href={`/dashboard/buyer/enquiries?focus=${encodeURIComponent(e.id)}`}
                          variant="secondary"
                        >
                          Open
                        </ActionButton>
                      </div>
                    </div>
                  </CardBody>

                  <CardFooter>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                      <Link
                        href={`/dashboard/buyer/enquiries?focus=${encodeURIComponent(e.id)}`}
                        style={{ fontWeight: 900 }}
                      >
                        Open thread →
                      </Link>
                      <span style={{ marginLeft: "auto", color: "#5b6472", fontSize: 13 }}>
                        Status is controlled by vendor/admin (you can still send follow-ups).
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Next step (when you say): add “Send Enquiry” buttons on public listing pages.
        </div>
      </Container>
    </main>
  );
}
export default function BuyerEnquiriesPageClient() {
  return <BuyerEnquiriesPageInner />;
}
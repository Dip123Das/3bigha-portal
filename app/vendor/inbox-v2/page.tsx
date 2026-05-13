import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { fetchVendorInbox, fetchVendorInboxStats } from "@/lib/rfq/vendor-inbox/server";
import { fetchVendorListingConversations } from "../../../lib/conversations/vendor-listing-inbox";
import VendorInboxV2Client from "./VendorInboxV2Client";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      nosnippet: true,
    },
  },
};

type Quoted = "" | "quoted" | "unquoted" | "revised" | "accepted";
type Sort =
  | "newest"
  | "oldest"
  | "unread"
  | "new"
  | "quote_updated"
  | "value_high"
  | "value_low";

type ListingTypeFilter = "all" | "property" | "material" | "service" | "rental";

type ListingChatRow = {
  id: string;
  title: string | null;
  buyer_user_id: string | null;
  buyer_name: string | null;
  vendor_user_id: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function normalizeQuoted(v: string | undefined): Quoted {
  if (v === "quoted" || v === "unquoted" || v === "revised" || v === "accepted") return v;
  return "";
}

function normalizeSort(v: string | undefined): Sort {
  if (
    v === "oldest" ||
    v === "unread" ||
    v === "new" ||
    v === "quote_updated" ||
    v === "value_high" ||
    v === "value_low"
  ) {
    return v;
  }
  return "newest";
}

function normalizeListingType(v: string | undefined): ListingTypeFilter {
  if (v === "property" || v === "material" || v === "service" || v === "rental") return v;
  return "all";
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        minWidth: 160,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function pillLinkStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: active ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
    background: active ? "#eff6ff" : "#fff",
    color: active ? "#1d4ed8" : "#374151",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

export default async function VendorInboxV2Page({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    status?: string;
    quoted?: string;
    sort?: string;
    page?: string;
    focus?: string;
    listingType?: string;
  };
}) {
  const q = searchParams?.q ?? "";
  const status = searchParams?.status ?? "";
  const quoted = normalizeQuoted(searchParams?.quoted);
  const sort = normalizeSort(searchParams?.sort);
  const focus = (searchParams?.focus ?? "").trim();
  const listingType = normalizeListingType(searchParams?.listingType);

  const page = Math.max(parseInt(searchParams?.page ?? "1", 10) || 1, 1);
  const pageSize = 10;
  const offset = (page - 1) * pageSize;

  const [res, stats, listingChatsRaw] = await Promise.all([
    fetchVendorInbox({
      q: q.trim() ? q : undefined,
      status: status || undefined,
      quoted,
      sort,
      limit: pageSize,
      offset,
    }),
    fetchVendorInboxStats(),
    fetchVendorListingConversations(),
  ]);

  const listingChatsAll = (listingChatsRaw ?? []) as ListingChatRow[];

  const listingChats = listingChatsAll
    .filter((c) => {
      if (listingType === "all") return true;
      if (listingType === "property") return c.context_type === "property_inquiry";
      if (listingType === "service") return c.context_type === "service_inquiry";
      if (listingType === "rental") return c.context_type === "rental_inquiry";
      if (listingType === "material") return c.context_type === "listing";
      return true;
    })
    .sort((a, b) => {
      const unreadDiff = Number(b.unread_count ?? 0) - Number(a.unread_count ?? 0);
      if (unreadDiff !== 0) return unreadDiff;

      const aTime = a.last_message_at ?? a.updated_at ?? a.created_at ?? "";
      const bTime = b.last_message_at ?? b.updated_at ?? b.created_at ?? "";

      const aMs = aTime ? new Date(aTime).getTime() : 0;
      const bMs = bTime ? new Date(bTime).getTime() : 0;

      return bMs - aMs;
    });

  const totalPages = Math.ceil((res.count ?? 0) / pageSize);

  function buildListingTypeHref(nextListingType: ListingTypeFilter) {
    const params = new URLSearchParams();

    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (quoted) params.set("quoted", quoted);
    if (sort) params.set("sort", sort);
    if (focus) params.set("focus", focus);
    if (page > 1) params.set("page", String(page));
    if (nextListingType !== "all") params.set("listingType", nextListingType);

    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Vendor Inbox</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            RFQ visibility, quote status, unread chat badges, and live chat previews are preserved here.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Listing Conversations</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
              Direct buyer enquiries from Property, Materials, Services and Rentals.
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 40,
              height: 32,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid #dbeafe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            {listingChats.length}
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={buildListingTypeHref("all")} style={pillLinkStyle(listingType === "all")}>
            All
          </Link>
          <Link href={buildListingTypeHref("property")} style={pillLinkStyle(listingType === "property")}>
            Property
          </Link>
          <Link href={buildListingTypeHref("material")} style={pillLinkStyle(listingType === "material")}>
            Material
          </Link>
          <Link href={buildListingTypeHref("service")} style={pillLinkStyle(listingType === "service")}>
            Service
          </Link>
          <Link href={buildListingTypeHref("rental")} style={pillLinkStyle(listingType === "rental")}>
            Rental
          </Link>
        </div>

        {listingChats.length > 0 ? (
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {listingChats.map((c) => {
              const conversationId = String(c.id ?? "").trim();
              const chatUrl = `/dashboard/vendor/chat/${encodeURIComponent(conversationId)}`;

              if (!isUuid(conversationId)) {
                return (
                  <div
                    key={`bad-${conversationId || Math.random()}`}
                    style={{
                      border: "1px solid #fecaca",
                      borderRadius: 14,
                      background: "#fff1f2",
                      padding: 14,
                      color: "#9f1239",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Invalid conversation id received for:
                    <div style={{ marginTop: 6, fontWeight: 800 }}>
                      {c.title || "Listing enquiry"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      Raw id: {conversationId || "—"}
                    </div>
                  </div>
                );
              }

              const badgeStyle: CSSProperties = {
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                whiteSpace: "nowrap",
              };

              let badgeNode: ReactNode = null;

                            const hasUnread = Number(c.unread_count ?? 0) > 0;
              const latestAt = c.last_message_at ?? c.updated_at ?? c.created_at ?? null;
              const isFresh =
                !!latestAt && Date.now() - new Date(latestAt).getTime() <= 1000 * 60 * 60 * 12;

              if (c.context_type === "property_inquiry") {
                badgeNode = (
                  <span style={{ ...badgeStyle, background: "#e0f2fe", color: "#0369a1" }}>
                    Property
                  </span>
                );
              } else if (c.context_type === "service_inquiry") {
                badgeNode = (
                  <span style={{ ...badgeStyle, background: "#ecfdf5", color: "#065f46" }}>
                    Service
                  </span>
                );
              } else if (c.context_type === "rental_inquiry") {
                badgeNode = (
                  <span style={{ ...badgeStyle, background: "#fef3c7", color: "#92400e" }}>
                    Rental
                  </span>
                );
              } else if (c.context_type === "listing") {
                badgeNode = (
                  <span style={{ ...badgeStyle, background: "#f3e8ff", color: "#6b21a8" }}>
                    Material
                  </span>
                );
              } else {
                badgeNode = (
                  <span style={{ ...badgeStyle, background: "#f3f4f6", color: "#374151" }}>
                    Chat
                  </span>
                );
              }

              return (
                <Link
                  key={conversationId}
                  href={chatUrl}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    border: hasUnread ? "1px solid #fecaca" : "1px solid #e5e7eb",
                    borderRadius: 14,
                    background: hasUnread ? "#fffaf0" : "#fff",
                    padding: 14,
                    display: "block",
                    boxShadow: hasUnread ? "inset 4px 0 0 #dc2626" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, lineHeight: 1.35 }}>
                        {c.title || "Listing enquiry"}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
                        Buyer: {c.buyer_name ?? "Buyer"}
                      </div>

                      {c.last_message_preview ? (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: "#111827",
                            lineHeight: 1.45,
                            fontWeight: c.unread_count > 0 ? 700 : 500,
                            wordBreak: "break-word",
                          }}
                        >
                          {c.last_message_preview}
                        </div>
                      ) : null}

                      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {c.last_message_at ?? c.updated_at
                            ? new Date(c.last_message_at ?? c.updated_at ?? "").toLocaleString()
                            : "—"}
                        </div>

                        {hasUnread ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 22,
                              height: 22,
                              padding: "0 8px",
                              borderRadius: 999,
                              background: "#dc2626",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {c.unread_count}
                          </span>
                        ) : null}

                        {isFresh ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background: "#ecfdf5",
                              color: "#065f46",
                            }}
                          >
                            Fresh chat
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>{badgeNode}</div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#111827" }}>
                    Open conversation →
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              marginTop: 12,
              padding: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "#fff",
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            No listing conversations found yet.
          </div>
        )}
      </div>

      {!stats.error && (
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatCard label="Total RFQs" value={stats.total} />
          <StatCard label="Unread" value={stats.unread} />
          <StatCard label="Quoted" value={stats.quoted} />
          <StatCard label="Pending response" value={stats.pending} />
          <StatCard label="Accepted" value={(stats as any).accepted ?? 0} />
        </div>
      )}

      <form method="get" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          name="q"
          placeholder="Search RFQ / Buyer / Locality"
          defaultValue={q}
          style={{ padding: 8, width: 260 }}
        />

        <select name="status" defaultValue={status} style={{ padding: 8 }}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

        <select name="quoted" defaultValue={quoted} style={{ padding: 8 }}>
          <option value="">All Quotes</option>
          <option value="quoted">Quoted</option>
          <option value="unquoted">Not Quoted</option>
          <option value="revised">Revised</option>
          <option value="accepted">Accepted</option>
        </select>

        <select name="sort" defaultValue={sort} style={{ padding: 8, minWidth: 220 }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="unread">Unread first</option>
          <option value="new">New RFQ first</option>
          <option value="quote_updated">Latest quote updated</option>
          <option value="value_high">Highest value first</option>
          <option value="value_low">Lowest value first</option>
        </select>

        {focus ? <input type="hidden" name="focus" value={focus} /> : null}
        {listingType !== "all" ? <input type="hidden" name="listingType" value={listingType} /> : null}

        <button type="submit" style={{ padding: "8px 16px" }}>
          Apply
        </button>
      </form>

      {res.error ? (
        <pre style={{ marginTop: 12, color: "crimson" }}>{res.error}</pre>
      ) : (
        <>
          <VendorInboxV2Client rows={res.rows} focusId={focus || undefined} />

          {totalPages > 1 && (
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;

                const href =
                  `?q=${encodeURIComponent(q)}` +
                  `&status=${encodeURIComponent(status)}` +
                  `&quoted=${encodeURIComponent(quoted)}` +
                  `&sort=${encodeURIComponent(sort)}` +
                  (focus ? `&focus=${encodeURIComponent(focus)}` : "") +
                  (listingType !== "all" ? `&listingType=${encodeURIComponent(listingType)}` : "") +
                  `&page=${p}`;

                return (
                  <a
                    key={p}
                    href={href}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #ccc",
                      background: p === page ? "#eee" : "white",
                      borderRadius: 8,
                    }}
                  >
                    {p}
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
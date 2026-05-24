import Link from "next/link";
import type { CSSProperties } from "react";
import { fetchBuyerListingConversations } from "@/lib/conversations/buyer-listing-inbox";
import BuyerWorkMenu from "@/components/buyer/BuyerWorkMenu";

export const dynamic = "force-dynamic";

type ListingTypeFilter = "all" | "property" | "material" | "service" | "rental";

type ListingChatRow = {
  id: string;
  title: string | null;
  buyer_user_id: string | null;
  vendor_user_id: string | null;
  vendor_name: string | null;
  vendor_business_name: string | null;
  vendor_city: string | null;
  vendor_locality: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_closed: boolean;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v?: string | null) {
  return UUID_RE.test(String(v ?? "").trim());
}

function normalizeListingType(v: string | undefined): ListingTypeFilter {
  if (v === "property" || v === "material" || v === "service" || v === "rental") return v;
  return "all";
}

function pillLinkStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 12,
    border: active ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
    background: active ? "#ecfdf5" : "#fff",
    color: active ? "#065f46" : "#374151",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

function buildBadge(contextType: string | null) {
  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };

  if (contextType === "property_inquiry") {
    return <span style={{ ...badgeStyle, background: "#e0f2fe", color: "#0369a1" }}>Property</span>;
  }

  if (contextType === "service_inquiry") {
    return <span style={{ ...badgeStyle, background: "#ecfdf5", color: "#065f46" }}>Service</span>;
  }

  if (contextType === "rental_inquiry") {
    return <span style={{ ...badgeStyle, background: "#fef3c7", color: "#92400e" }}>Rental</span>;
  }

  if (contextType === "listing") {
    return <span style={{ ...badgeStyle, background: "#f3e8ff", color: "#6b21a8" }}>Material</span>;
  }

  return <span style={{ ...badgeStyle, background: "#f3f4f6", color: "#374151" }}>Chat</span>;
}

function fmtWhen(v?: string | null) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

function buildListingTypeHref(nextListingType: ListingTypeFilter) {
  const params = new URLSearchParams();
  if (nextListingType !== "all") params.set("listingType", nextListingType);

  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

export default async function BuyerInboxPage({
  searchParams,
}: {
  searchParams?: {
    listingType?: string;
  };
}) {
  const listingType = normalizeListingType(searchParams?.listingType);
  const listingChatsRaw = (await fetchBuyerListingConversations()) as ListingChatRow[];

  const listingChats = listingChatsRaw
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

  const totalUnread = listingChats.reduce((sum, row) => sum + Number(row.unread_count ?? 0), 0);

  return (
    <div style={{ padding: 12, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Buyer Inbox</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Direct conversations with vendors from Property, Materials, Services and Rentals.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/buyer" style={{ fontWeight: 800, textDecoration: "none" }}>
            ← Buyer Dashboard
          </Link>
          <Link href="/dashboard/buyer/enquiries" style={{ fontWeight: 800, textDecoration: "none" }}>
            Legacy Enquiries
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <BuyerWorkMenu />
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
              Open any conversation to continue chat, call the vendor, or review the latest messages.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 40,
                height: 32,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #dcfce7",
                background: "#f0fdf4",
                color: "#166534",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {listingChats.length} total
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 40,
                height: 32,
                padding: "0 12px",
                borderRadius: 12,
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#b91c1c",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {totalUnread} unread
            </div>
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
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {listingChats.map((c) => {
              const conversationId = String(c.id ?? "").trim();
              const chatUrl = `/dashboard/buyer/chat/${encodeURIComponent(conversationId)}`;

              if (!isUuid(conversationId)) {
                return (
                  <div
                    key={`bad-${conversationId || Math.random()}`}
                    style={{
                      border: "1px solid #fecaca",
                      borderRadius: 12,
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

              const localityLine = [c.vendor_locality, c.vendor_city].filter(Boolean).join(", ");

              return (
                <Link
                  key={conversationId}
                  href={chatUrl}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    border: c.unread_count > 0 ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                    borderRadius: 12,
                    background: c.unread_count > 0 ? "#f0fdf4" : "#fff",
                    padding: 14,
                    display: "block",
                    boxShadow: c.unread_count > 0 ? "inset 4px 0 0 #16a34a" : "none",
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
                        Vendor: {c.vendor_name ?? "Vendor"}
                      </div>

                      {localityLine ? (
                        <div style={{ marginTop: 4, fontSize: 12, color: "#9ca3af" }}>
                          {localityLine}
                        </div>
                      ) : null}

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
                          {fmtWhen(c.last_message_at ?? c.updated_at)}
                        </div>

                        {c.is_closed ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 800,
                              background: "#f3f4f6",
                              color: "#374151",
                            }}
                          >
                            Closed
                          </span>
                        ) : null}

                        {c.unread_count > 0 ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 22,
                              height: 22,
                              padding: "0 8px",
                              borderRadius: 12,
                              background: "#16a34a",
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 900,
                              lineHeight: 1,
                            }}
                          >
                            {c.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>{buildBadge(c.context_type)}</div>
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
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
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
    </div>
  );
}
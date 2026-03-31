// app/page.tsx
"use client";

import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import GlobalUnreadBadge from "./_components/GlobalUnreadBadge";

export default function HomePage() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <main>
      <Container>
        <SectionHeader
          title="3Bigha.com"
          subtitle="Real-estate & construction ecosystem — properties, materials, services, rentals, and news."
          right={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: "#0b57d0",
                  marginRight: 6,
                }}
              >
                Browse
              </span>

              <ActionButton
                href="/property"
                variant={isActive("/property") ? "primary" : "secondary"}
              >
                Properties
              </ActionButton>

              <ActionButton
                href="/materials"
                variant={isActive("/materials") ? "primary" : "secondary"}
              >
                Materials
              </ActionButton>

              <ActionButton
                href="/services"
                variant={isActive("/services") ? "primary" : "secondary"}
              >
                Services
              </ActionButton>

              <ActionButton
                href="/rentals"
                variant={isActive("/rentals") ? "primary" : "secondary"}
              >
                Rentals
              </ActionButton>

              <ActionButton
                href="/blog"
                variant={isActive("/blog") ? "primary" : "secondary"}
              >
                Blog / News
              </ActionButton>
            </div>
          }
        />

        <div style={{ marginTop: 12 }}>
          <Card>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 260, flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>
                    ✍️ Need Property, Materials, Services or Rentals? Submit your Requirement (RFQ)
                  </div>

                  <div style={{ marginTop: 8, color: "#5b6472", lineHeight: 1.5 }}>
                    Upload a handwritten list / PDF or type your requirement. <br />
                    <b>Enter your location</b> so nearby vendors, owners or service providers can send{" "}
                    <b>competitive quotations</b>.
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 700,
                        fontSize: 13,
                        background: "#fff",
                      }}
                    >
                      📄 PDF / List
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 700,
                        fontSize: 13,
                        background: "#fff",
                      }}
                    >
                      📝 Handwritten photo
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 700,
                        fontSize: 13,
                        background: "#fff",
                      }}
                    >
                      📍 Location-based quotes
                    </span>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        border: "1px solid rgba(0,0,0,0.12)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontWeight: 700,
                        fontSize: 13,
                        background: "#fff",
                      }}
                    >
                      ⚡ Competitive pricing
                    </span>
                  </div>
                </div>

                <div style={{ minWidth: 280 }}>
                  <details
                    style={{
                      border: "1px solid rgba(0,0,0,0.12)",
                      borderRadius: 14,
                      padding: 10,
                      background: "rgba(11,87,208,0.04)",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        listStyle: "none",
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      What is “Submit Requirement”?
                      <span style={{ opacity: 0.7 }}>▾</span>
                    </summary>

                    <div style={{ marginTop: 10, color: "#333", lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>How it works</div>
                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        <li>Enter your location (City + Locality).</li>
                        <li>Upload a list or type your requirement (materials / property / service / rental).</li>
                        <li>Nearby vendors, owners or service providers will quote competitively.</li>
                        <li>You compare and choose the best offer.</li>
                      </ol>
                      <div style={{ marginTop: 10, color: "#5b6472" }}>
                        Tip: If you don’t know exact names/details, just upload a photo or write in simple words—our
                        vendors/providers will guide you.
                      </div>
                    </div>
                  </details>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <ActionButton href="/rfq/general/new" variant="primary" fullWidth>
                      Submit Requirement →
                    </ActionButton>

                    <div
                      style={{
                        minHeight: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                      }}
                    >
                      <GlobalUnreadBadge
                        href="/vendor/inbox-v2"
                        label="Vendor Inbox →"
                        title="Open Vendor Inbox"
                      />
                    </div>

                    <div
                      style={{
                        minHeight: 44,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                      }}
                    >
                      <GlobalUnreadBadge
                        href="/dashboard/inbox"
                        label="Unified Inbox →"
                        title="Open Unified Inbox"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            marginTop: 14,
          }}
        >
          <Card>
            <CardBody>
              <h3 style={{ margin: 0 }}>Property</h3>
              <p style={{ margin: "6px 0 0", color: "#5b6472" }}>
                Sell, rent, land, commercial listings.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/property" variant="secondary" fullWidth>
                  View Listings
                </ActionButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ margin: 0 }}>Materials</h3>
              <p style={{ margin: "6px 0 0", color: "#5b6472" }}>
                Building materials marketplace.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/materials" variant="secondary" fullWidth>
                  Browse Materials
                </ActionButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ margin: 0 }}>Services</h3>
              <p style={{ margin: "6px 0 0", color: "#5b6472" }}>
                Professional, skilled, legal & technical services.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/services" variant="secondary" fullWidth>
                  Explore Services
                </ActionButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ margin: 0 }}>Rentals</h3>
              <p style={{ margin: "6px 0 0", color: "#5b6472" }}>
                Machinery, tools, shuttering & equipment rentals.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/rentals" variant="secondary" fullWidth>
                  See Rentals
                </ActionButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 style={{ margin: 0 }}>Blog / News</h3>
              <p style={{ margin: "6px 0 0", color: "#5b6472" }}>
                Real-estate & construction updates, guides and insights.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/blog" variant="secondary" fullWidth>
                  Read Posts
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}
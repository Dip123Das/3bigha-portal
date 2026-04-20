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
        <section
          style={{
            marginTop: 8,
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0b57d0 0%, #0f766e 55%, #dbeafe 100%)",
            boxShadow: "0 18px 50px rgba(11,87,208,0.18)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              padding: 24,
              alignItems: "center",
            }}
          >
            <div style={{ color: "#fff" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                Trusted local marketplace for real estate & construction
              </div>

              <div style={{ marginTop: 14 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(34px, 5vw, 52px)",
                    lineHeight: 1.05,
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: "-0.02em",
                    textShadow: "0 2px 10px rgba(0,0,0,0.18)",
                  }}
                >
                  3Bigha.com
                </h1>

                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 0,
                    fontSize: 18,
                    lineHeight: 1.6,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.96)",
                    maxWidth: 700,
                    textShadow: "0 1px 6px rgba(0,0,0,0.12)",
                  }}
                >
                  A smarter real-estate and construction marketplace for property, materials, services, rentals, investment and local business discovery.
                </p>
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 15,
                  lineHeight: 1.65,
                  maxWidth: 640,
                }}
              >
                Discover verified opportunities, submit your requirement, compare quotations, and connect with nearby vendors, owners, builders and investors through one unified platform.
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                <ActionButton href="/property" variant="secondary">
                  Explore Property
                </ActionButton>

                <ActionButton href="/rfq/general/new" variant="primary">
                  Submit Requirement
                </ActionButton>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                <span
                  style={{
                    fontWeight: 900,
                    color: "#fff",
                    marginRight: 4,
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
                  href="/investment"
                  variant={isActive("/investment") ? "primary" : "secondary"}
                >
                  Investment
                </ActionButton>

                <ActionButton
                  href="/blog"
                  variant={isActive("/blog") ? "primary" : "secondary"}
                >
                  Blog / News
                </ActionButton>
              </div>
            </div>

            <div>
              <div
                style={{
                  minHeight: 320,
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  padding: 18,
                  backdropFilter: "blur(6px)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    borderRadius: 18,
                    background: "#ffffff",
                    padding: 16,
                    color: "#0f172a",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0b57d0" }}>
                    MARKETPLACE COVERAGE
                  </div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>
                    Property • Materials • Services • Rentals
                  </div>
                  <div style={{ marginTop: 6, color: "#5b6472", lineHeight: 1.5 }}>
                    One portal to discover, compare and connect across the complete construction and real-estate ecosystem.
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.92)",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>📍</div>
                    <div style={{ marginTop: 8, fontWeight: 900, color: "#0f172a" }}>
                      Local discovery
                    </div>
                    <div style={{ marginTop: 4, color: "#5b6472", fontSize: 14, lineHeight: 1.45 }}>
                      Nearby search and district-focused onboarding.
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.92)",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>🧾</div>
                    <div style={{ marginTop: 8, fontWeight: 900, color: "#0f172a" }}>
                      Requirement to quote
                    </div>
                    <div style={{ marginTop: 4, color: "#5b6472", fontSize: 14, lineHeight: 1.45 }}>
                      Buyers can submit needs and receive competitive responses.
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.92)",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>🤝</div>
                    <div style={{ marginTop: 8, fontWeight: 900, color: "#0f172a" }}>
                      Business networking
                    </div>
                    <div style={{ marginTop: 4, color: "#5b6472", fontSize: 14, lineHeight: 1.45 }}>
                      Connect vendors, owners, builders, buyers and investors.
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.92)",
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 24 }}>🏗️</div>
                    <div style={{ marginTop: 8, fontWeight: 900, color: "#0f172a" }}>
                      Professional image
                    </div>
                    <div style={{ marginTop: 4, color: "#5b6472", fontSize: 14, lineHeight: 1.45 }}>
                      Stronger first impression for visitors landing on your portal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
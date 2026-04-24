// app/page.tsx
"use client";

import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import GlobalUnreadBadge from "./_components/GlobalUnreadBadge";

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid rgba(15,23,42,0.10)",
  borderRadius: 999,
  padding: "7px 12px",
  fontWeight: 800,
  fontSize: 13,
  background: "#fff",
  color: "#0f172a",
  boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
};

const featureCardStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "rgba(255,255,255,0.96)",
  padding: 16,
  boxShadow: "0 10px 28px rgba(15,23,42,0.10)",
};

export default function HomePage() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <main>
      <Container>
        <section
          className="homeHero"
          style={{
            marginTop: 8,
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(rgba(11,87,208,0.78), rgba(15,118,110,0.78)), url('/hero-real-estate.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            boxShadow: "0 20px 60px rgba(11,87,208,0.18)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0.05) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            className="homeHeroInner"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: 20,
              padding: "20px",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div className="homeHeroMain" style={{ color: "#fff" }}>
              <div
                className="heroLogoFull"
                style={{
                  marginBottom: 10,
                }}
              >
                <img
                  src="/logo.png"
                  alt="3Bigha"
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.20)",
                  border: "1px solid rgba(255,255,255,0.34)",
                  fontWeight: 900,
                  fontSize: 12,
                  color: "#ffffff",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                  maxWidth: "100%",
                  whiteSpace: "normal",
                  lineHeight: 1.4,
                }}
              >
                Trusted local marketplace for real estate & construction
              </div>

              <div style={{ marginTop: 18, maxWidth: 760, width: "100%" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(32px, 9vw, 64px)",
                    lineHeight: 1.02,
                    fontWeight: 900,
                    color: "#ffffff",
                    letterSpacing: "-0.04em",
                    textShadow: "0 3px 16px rgba(0,0,0,0.22)",
                  }}
                >
                  3Bigha.com
                </h1>

                <p
                  style={{
                    marginTop: 14,
                    marginBottom: 0,
                    fontSize: "clamp(16px, 4.6vw, 20px)",
                    lineHeight: 1.6,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.98)",
                    maxWidth: 720,
                    textShadow: "0 1px 8px rgba(0,0,0,0.14)",
                  }}
                >
                  A smarter real-estate and construction marketplace for
                  property, materials, services, rentals, investment and local
                  business discovery.
                </p>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#ffffff",
                  fontSize: "clamp(15px, 4.2vw, 17px)",
                  lineHeight: 1.72,
                  fontWeight: 500,
                  maxWidth: 680,
                  textShadow: "0 1px 8px rgba(0,0,0,0.16)",
                }}
              >
                Discover verified opportunities, submit your requirement,
                compare quotations, and connect with nearby vendors, owners,
                builders and investors through one unified platform.
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 18,
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
                className="homeHeroStats"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                  gap: 10,
                  marginTop: 18,
                  maxWidth: 700,
                  width: "100%",
                }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>
                    COVERAGE
                  </div>
                  <div style={{ marginTop: 5, fontSize: 18, fontWeight: 900 }}>
                    All-in-one
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45 }}>
                    Property, materials, services, rentals and investment
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>
                    LOCAL-FIRST
                  </div>
                  <div style={{ marginTop: 5, fontSize: 18, fontWeight: 900 }}>
                    Nearby reach
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45 }}>
                    Better discovery using verified location-based onboarding
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 16,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>
                    WORKFLOW
                  </div>
                  <div style={{ marginTop: 5, fontSize: 18, fontWeight: 900 }}>
                    RFQ to chat
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45 }}>
                    Submit needs, compare quotes and continue in unified inbox
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 18,
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

            <div className="homeHeroSide">
              <div
                className="homeHeroPanel"
                style={{
                  minHeight: 0,
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  padding: 16,
                  backdropFilter: "blur(8px)",
                  display: "grid",
                  gap: 12,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                <div
                  style={{
                    borderRadius: 20,
                    background: "#ffffff",
                    padding: 18,
                    color: "#0f172a",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.10)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#0b57d0",
                      letterSpacing: "0.04em",
                    }}
                  >
                    MARKETPLACE COVERAGE
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    Property • Materials • Services • Rentals
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#475569",
                      lineHeight: 1.6,
                    }}
                  >
                    One portal to discover, compare and connect across the
                    complete construction and real-estate ecosystem.
                  </div>
                </div>

                <div
                  className="homeHeroFeatureGrid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="homeHeroFeatureCard" style={featureCardStyle}>
                    <div style={{ fontSize: 24 }}>📍</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 900,
                        color: "#0f172a",
                        fontSize: 16,
                      }}
                    >
                      Local discovery
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#475569",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      Nearby search and district-focused onboarding.
                    </div>
                  </div>

                  <div className="homeHeroFeatureCard" style={featureCardStyle}>
                    <div style={{ fontSize: 24 }}>🧾</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 900,
                        color: "#0f172a",
                        fontSize: 16,
                      }}
                    >
                      Requirement to quote
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#475569",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      Buyers can submit needs and receive competitive responses.
                    </div>
                  </div>

                  <div className="homeHeroFeatureCard homeHeroFeatureCardOptional" style={featureCardStyle}>
                    <div style={{ fontSize: 24 }}>🤝</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 900,
                        color: "#0f172a",
                        fontSize: 16,
                      }}
                    >
                      Business networking
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#475569",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      Connect vendors, owners, builders, buyers and investors.
                    </div>
                  </div>

                  <div className="homeHeroFeatureCard homeHeroFeatureCardOptional" style={featureCardStyle}>
                    <div style={{ fontSize: 24 }}>🏗️</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 900,
                        color: "#0f172a",
                        fontSize: 16,
                      }}
                    >
                      Professional image
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#475569",
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      Stronger first impression for visitors landing on your
                      portal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginTop: 14 }}>
          <Card>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 320px" }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 20,
                      lineHeight: 1.25,
                      color: "#0f172a",
                    }}
                  >
                    ✍️ Need Property, Materials, Services or Rentals? Submit your
                    Requirement (RFQ)
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#475569",
                      lineHeight: 1.7,
                      fontSize: 16,
                    }}
                  >
                    Upload a handwritten list / PDF or type your requirement.
                    <br />
                    <b style={{ color: "#0f172a" }}>Enter your location</b> so
                    nearby vendors, owners or service providers can send{" "}
                    <b style={{ color: "#0f172a" }}>competitive quotations</b>.
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={chipStyle}>📄 PDF / List</span>
                    <span style={chipStyle}>📝 Handwritten photo</span>
                    <span style={chipStyle}>📍 Location-based quotes</span>
                    <span style={chipStyle}>⚡ Competitive pricing</span>
                  </div>
                </div>

                <div style={{ minWidth: 0, width: "100%", maxWidth: 340, flex: "1 1 300px" }}>
                  <details
                    style={{
                      border: "1px solid rgba(15,23,42,0.10)",
                      borderRadius: 16,
                      padding: 12,
                      background:
                        "linear-gradient(180deg, rgba(11,87,208,0.05) 0%, rgba(15,118,110,0.03) 100%)",
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
                        color: "#0f172a",
                      }}
                    >
                      What is “Submit Requirement”?
                      <span style={{ opacity: 0.7 }}>▾</span>
                    </summary>

                    <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.6 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          marginBottom: 6,
                          color: "#0f172a",
                        }}
                      >
                        How it works
                      </div>
                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        <li>Enter your location (City + Locality).</li>
                        <li>
                          Upload a list or type your requirement (materials /
                          property / service / rental).
                        </li>
                        <li>
                          Nearby vendors, owners or service providers will quote
                          competitively.
                        </li>
                        <li>You compare and choose the best offer.</li>
                      </ol>
                      <div style={{ marginTop: 10, color: "#475569" }}>
                        Tip: If you don’t know exact names/details, just upload
                        a photo or write in simple words—our vendors/providers
                        will guide you.
                      </div>
                    </div>
                  </details>

                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <ActionButton href="/rfq/general/new" variant="primary" fullWidth>
                      Submit Requirement →
                    </ActionButton>

                    <div
                      style={{
                        minHeight: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(15,23,42,0.10)",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
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
                        minHeight: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(15,23,42,0.10)",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
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
          className="homeCardsGrid"
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            marginTop: 14,
          }}
        >
          <Card>
            <CardBody>
              <div style={{ fontSize: 22 }}>🏠</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Property</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Sell, rent, land, residential and commercial listings.
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
              <div style={{ fontSize: 22 }}>🧱</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Materials</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Building materials marketplace for suppliers and buyers.
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
              <div style={{ fontSize: 22 }}>🛠️</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Services</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Professional, skilled, legal and technical services.
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
              <div style={{ fontSize: 22 }}>🚜</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Rentals</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Machinery, tools, shuttering and equipment rentals.
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
              <div style={{ fontSize: 22 }}>📰</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Blog / News</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Real-estate and construction updates, guides and insights.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/blog" variant="secondary" fullWidth>
                  Read Posts
                </ActionButton>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div style={{ fontSize: 22 }}>💼</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Investment</h3>
              <p style={{ margin: "6px 0 0", color: "#475569", lineHeight: 1.6 }}>
                Discover opportunities and connect builders with investors.
              </p>
              <div style={{ marginTop: 12 }}>
                <ActionButton href="/investment" variant="secondary" fullWidth>
                  Explore Investment
                </ActionButton>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </main>
  );
}
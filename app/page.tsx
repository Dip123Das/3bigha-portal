// app/page.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  padding: "14px 16px",
  boxShadow: "0 10px 28px rgba(15,23,42,0.10)",
};

const suggestionBoxStyle: React.CSSProperties = {
  width: "100%",
  background: "#111827",
  borderRadius: 10,
  marginTop: 4,
  padding: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
};

const suggestionItemStyle: React.CSSProperties = {
  padding: "7px 9px",
  cursor: "pointer",
  fontSize: 13,
  color: "#fff",
  borderRadius: 8,
};

export default function HomePage() {
  const pathname = usePathname();
  const router = useRouter();

  const [heroSearch, setHeroSearch] = useState("");
  const [searchModule, setSearchModule] = useState("property");
  const [locationText, setLocationText] = useState("");
  const [useNearMe, setUseNearMe] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(
    () => [
      "cement supplier",
      "cement price",
      "brick supplier",
      "sand price",
      "steel rod dealer",
      "house construction service",
      "property for sale",
      "plot for investment",
      "rental house",
      "2BHK flat",
      "land for sale",
      "builder project",
    ],
    []
  );

  const trendingSearches = useMemo(
    () => [
      "cement supplier",
      "2BHK flat",
      "plot for sale",
      "construction service",
      "steel rod price",
      "investment opportunity",
    ],
    []
  );

  const isActive = (path: string) => pathname.startsWith(path);

  const getFinalQuery = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return "";

    return useNearMe && locationText ? `${clean} ${locationText}` : clean;
  };

  const saveRecentSearch = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;

    const prev = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const updated = [clean, ...prev.filter((p: string) => p !== clean)].slice(
      0,
      5
    );

    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const runHeroSearch = (raw = heroSearch) => {
    const finalQuery = getFinalQuery(raw);
    if (!finalQuery) return;

    saveRecentSearch(raw);
    setShowSuggestions(false);

    router.push(
      `/search?module=${searchModule}&q=${encodeURIComponent(finalQuery)}`
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();

        const city =
          data?.address?.city ||
          data?.address?.town ||
          data?.address?.village ||
          data?.address?.county ||
          "";

        if (city) setLocationText(city);
      } catch {
        // Location display is helpful, but not required.
      }
    });
  }, []);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    setRecentSearches(stored);
  }, []);

  useEffect(() => {
    if (!heroSearch.trim()) return;

    const timer = setTimeout(() => {
      runHeroSearch(heroSearch);
    }, 900);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSearch]);

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(heroSearch.toLowerCase()))
    .slice(0, 5);

  const renderHighlightedSuggestion = (s: string) => {
    const idx = s.toLowerCase().indexOf(heroSearch.toLowerCase());

    if (!heroSearch || idx === -1) return s;

    const before = s.slice(0, idx);
    const match = s.slice(idx, idx + heroSearch.length);
    const after = s.slice(idx + heroSearch.length);

    return (
      <>
        {before}
        <span style={{ color: "#22c55e", fontWeight: 800 }}>{match}</span>
        {after}
      </>
    );
  };

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
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
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
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: 20,
              padding: "20px",
              alignItems: "center",
              position: "relative",
            }}
          >
            <div className="homeHeroMain" style={{ color: "#fff" }}>
              <div className="heroLogoFull" style={{ marginBottom: 10 }}>
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
                  alignItems: "start",
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
                  Built for your local area, anywhere in India — 3Bigha connects
                  property, materials, services, rentals and trusted businesses,
                  while unlocking powerful investment opportunities for local
                  people to grow their earnings.
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
                Search nearby opportunities, submit your requirement, compare
                quotations, connect with verified businesses, and explore local
                investment possibilities through one unified platform.
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
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 16,
                }}
              >
                <span style={chipStyle}>📍 Local-first discovery</span>
                <span style={chipStyle}>✅ Verified businesses</span>
                <span style={chipStyle}>💬 RFQ + unified chat</span>
                <span style={chipStyle}>📈 Local investment growth</span>
              </div>

              <div
                className="homeHeroStats"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
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
                  marginTop: 18,
                  maxWidth: 760,
                  width: "100%",
                }}
              >
                {locationText && (
                  <div
                    style={{
                      fontSize: 13,
                      marginBottom: 6,
                      color: "#e5e7eb",
                      fontWeight: 700,
                    }}
                  >
                    📍 Showing results for {locationText}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                    fontSize: 13,
                    color: "#e5e7eb",
                    fontWeight: 700,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={useNearMe}
                    onChange={(e) => setUseNearMe(e.target.checked)}
                  />
                  <span>Near me</span>
                </div>

                <div
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 160);
                  }}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    value={searchModule}
                    onChange={(e) => setSearchModule(e.target.value)}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                    }}
                  >
                    <option value="property">Property</option>
                    <option value="materials">Materials</option>
                    <option value="services">Services</option>
                    <option value="rentals">Rentals</option>
                    <option value="investment">Investment</option>
                  </select>

                  <input
                    type="text"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && heroSearch.trim()) {
                        runHeroSearch(heroSearch);
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search property, materials, services, investment..."
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.2)",
                      outline: "none",
                      background: "rgba(255,255,255,0.08)",
                      color: "#fff",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const SpeechRecognition =
                        (window as any).SpeechRecognition ||
                        (window as any).webkitSpeechRecognition;

                      if (!SpeechRecognition) {
                        alert("Voice search not supported in this browser");
                        return;
                      }

                      const recognition = new SpeechRecognition();
                      recognition.lang = "en-IN";

                      recognition.onresult = (event: any) => {
                        const text = event.results[0][0].transcript;
                        setHeroSearch(text);
                        setShowSuggestions(false);
                      };

                      recognition.start();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "#22c55e",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🎤
                  </button>

                  <button
                    type="button"
                    onClick={() => runHeroSearch(heroSearch)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#ef4444",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Search
                  </button>

                  {showSuggestions && heroSearch.length > 1 ? (
                    <div style={suggestionBoxStyle}>
                      {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((s) => (
                          <div
                            key={s}
                            onMouseDown={() => {
                              setHeroSearch(s);
                              setShowSuggestions(false);
                            }}
                            style={suggestionItemStyle}
                          >
                            {renderHighlightedSuggestion(s)}
                          </div>
                        ))
                      ) : (
                        <div style={{ ...suggestionItemStyle, opacity: 0.75 }}>
                          Press Enter to search “{heroSearch}”
                        </div>
                      )}
                    </div>
                  ) : showSuggestions && recentSearches.length > 0 ? (
                    <div style={suggestionBoxStyle}>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 4,
                          color: "#fff",
                        }}
                      >
                        Recent searches
                      </div>

                      {recentSearches.map((s) => (
                        <div
                          key={s}
                          onMouseDown={() => {
                            setHeroSearch(s);
                            setShowSuggestions(false);
                          }}
                          style={suggestionItemStyle}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : showSuggestions ? (
                    <div style={suggestionBoxStyle}>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 4,
                          color: "#fff",
                        }}
                      >
                        Trending searches
                      </div>

                      {trendingSearches.map((s) => (
                        <div
                          key={s}
                          onMouseDown={() => {
                            setHeroSearch(s);
                            setShowSuggestions(false);
                          }}
                          style={suggestionItemStyle}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 900,
                      color: "#fff",
                      marginRight: 4,
                    }}
                  >
                    Choose your need
                  </span>

                  <ActionButton
                    href="/property"
                    variant={isActive("/property") ? "primary" : "secondary"}
                  >
                    Buy / Sell Property
                  </ActionButton>

                  <ActionButton
                    href="/materials"
                    variant={isActive("/materials") ? "primary" : "secondary"}
                  >
                    Get Materials
                  </ActionButton>

                  <ActionButton
                    href="/services"
                    variant={isActive("/services") ? "primary" : "secondary"}
                  >
                    Hire Services
                  </ActionButton>

                  <ActionButton
                    href="/rentals"
                    variant={isActive("/rentals") ? "primary" : "secondary"}
                  >
                    Find Rentals
                  </ActionButton>

                  <ActionButton href="/investment" variant="primary">
                    🚀 Invest & Earn
                  </ActionButton>

                  <ActionButton
                    href="/blog"
                    variant={isActive("/blog") ? "primary" : "secondary"}
                  >
                    Learn / News
                  </ActionButton>
                </div>
              </div>
            </div>

            <div
              className="homeHeroSide"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                className="homeHeroPanel"
                style={{
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  padding: 16,
                  backdropFilter: "blur(8px)",
                  display: "grid",
                  gridTemplateRows: "auto auto",
                  alignContent: "start",
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
                    SMART LOCAL MARKETPLACE
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 22,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    Search • Compare • Connect • Invest
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#475569",
                      lineHeight: 1.6,
                    }}
                  >
                    A single platform for local discovery, RFQ comparison,
                    business networking and real investment opportunities.
                  </div>
                </div>

                <div
                  className="homeHeroFeatureGrid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div className="homeHeroFeatureCard" style={featureCardStyle}>
                    <div style={{ fontSize: 24 }}>📍</div>
                    <div
                      style={{
                        marginTop: 4,
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
                    <div style={{ fontSize: 20 }}>🧾</div>
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

                  <div
                    className="homeHeroFeatureCard homeHeroFeatureCardOptional"
                    style={featureCardStyle}
                  >
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

                  <div
                    className="homeHeroFeatureCard homeHeroFeatureCardOptional"
                    style={featureCardStyle}
                  >
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
                    ✍️ Need Property, Materials, Services or Rentals? Submit
                    your Requirement (RFQ)
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

                <div
                  style={{
                    minWidth: 0,
                    width: "100%",
                    maxWidth: 340,
                    flex: "1 1 300px",
                  }}
                >
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

                    <div
                      style={{
                        marginTop: 10,
                        color: "#334155",
                        lineHeight: 1.6,
                      }}
                    >
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
                    <ActionButton
                      href="/rfq/general/new"
                      variant="primary"
                      fullWidth
                    >
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
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
            marginTop: 14,
          }}
        >
          <Card>
            <CardBody>
              <div style={{ fontSize: 22 }}>🏠</div>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Property
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Materials
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Services
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Rentals
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Blog / News
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>
                Investment
              </h3>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  lineHeight: 1.6,
                }}
              >
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
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
  position: "relative",
  zIndex: 5,
};

const suggestionItemStyle: React.CSSProperties = {
  padding: "7px 9px",
  cursor: "pointer",
  fontSize: 13,
  color: "#fff",
  borderRadius: 8,
};

type WorkflowStep = {
  label: string;
  href: string;
  active: boolean;
  hint: string;
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

  const buildAutoRFQParams = (raw: string) => {
    const clean = raw.trim();
    const text = clean.toLowerCase();

    const quantityMatch = text.match(/\b(\d+)\s*(bags?|pcs?|pieces?|cft|sqft|tons?|kg|bricks?)?\b/);
    const quantity = quantityMatch?.[1] || "";
    const unit = quantityMatch?.[2] || "";

    const itemWords = [
      "cement",
      "steel",
      "sand",
      "brick",
      "bricks",
      "rod",
      "stone",
      "chips",
      "paint",
      "tiles",
      "pipe",
      "wire",
    ];

    const item = itemWords.find((word) => text.includes(word)) || "";

    const urgency =
      text.includes("urgent") ||
      text.includes("immediate") ||
      text.includes("asap") ||
      text.includes("fast")
        ? "urgent"
        : "normal";

    const params = new URLSearchParams();
    params.set("query", clean);

    if (item) params.set("item", item);
    if (quantity) params.set("quantity", quantity);
    if (unit) params.set("unit", unit);
    if (urgency) params.set("urgency", urgency);
    if (locationText) params.set("location", locationText);

    return params.toString();
  };

  const inferAICommand = (raw: string) => {
    const text = raw.toLowerCase();

    const has = (...words: string[]) =>
      words.some((w) => text.includes(w));

    const isUrgent = has("urgent", "immediate", "fast", "asap");
    const hasQty = /\d+/.test(text);

    // RFQ / requirement intent
    if (
      has(
        "need",
        "require",
        "rfq",
        "quotation",
        "quote",
        "supplier",
        "vendor"
      ) ||
      hasQty
    ) {
      return {
        module: "materials",
        label: `RFQ Auto-fill${hasQty ? " → Qty detected" : ""}${
          isUrgent ? " → Urgent" : ""
        }`,
        path: `/rfq/general/new?${buildAutoRFQParams(raw)}`,
      };
    }

    // price intent
    if (has("price", "rate", "cost", "cement", "steel", "sand", "brick")) {
      return {
        module: "materials",
        label: "Price → Market rates",
        path: `/price-today?q=${encodeURIComponent(raw.trim())}`,
      };
    }

    // investment intent
    if (has("invest", "investment", "roi", "return", "profit")) {
      return {
        module: "investment",
        label: "Investment → Opportunities",
        path: `/investment/opportunities?q=${encodeURIComponent(raw.trim())}`,
      };
    }

    // rental intent
    if (has("rent", "rental", "machine", "equipment", "hire")) {
      return {
        module: "rentals",
        label: "Rental → Nearby options",
        path: `/search?module=rentals&q=${encodeURIComponent(
          getFinalQuery(raw)
        )}`,
      };
    }

    // service intent
    if (has("service", "mason", "engineer", "contractor", "labour")) {
      return {
        module: "services",
        label: "Service → Provider search",
        path: `/search?module=services&q=${encodeURIComponent(
          getFinalQuery(raw)
        )}`,
      };
    }

    return {
      module: searchModule,
      label: "Smart search → Results",
      path: `/search?module=${searchModule}&q=${encodeURIComponent(
        getFinalQuery(raw)
      )}`,
    };
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
    const clean = raw.trim();
    if (!clean) return;

    const aiCommand = inferAICommand(clean);

    saveRecentSearch(clean);
    setShowSuggestions(false);

    router.push(aiCommand.path);
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

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase().includes(heroSearch.toLowerCase()))
    .slice(0, 5);

  const aiCommandPreview = heroSearch.trim()
    ? (() => {
        const ai = inferAICommand(heroSearch);
        const parsed = buildAutoRFQParams(heroSearch);

        return {
          ...ai,
          parsed,
        };
      })()
    : null;

  const dynamicWorkflowSteps = useMemo<WorkflowStep[]>(() => {
    const latestSearch = recentSearches[0] || "";
    const activityText = `${heroSearch} ${latestSearch}`.toLowerCase();

    const hasRequirementIntent =
      /\d+/.test(activityText) ||
      activityText.includes("need") ||
      activityText.includes("cement") ||
      activityText.includes("steel") ||
      activityText.includes("sand") ||
      activityText.includes("brick") ||
      activityText.includes("supplier");

    const hasPriceIntent =
      activityText.includes("price") ||
      activityText.includes("rate") ||
      activityText.includes("cost");

    const hasChatIntent =
      pathname.includes("/dashboard/inbox") ||
      pathname.includes("/dashboard/thread");

    return [
      {
        label: hasRequirementIntent ? "Resume RFQ →" : "Requirement →",
        href: "/rfq/general/new",
        active: hasRequirementIntent || pathname.includes("/rfq"),
        hint: hasRequirementIntent
          ? "AI detected requirement intent from your activity"
          : "Start with a new requirement",
      },
      {
        label: hasPriceIntent ? "Check Rates →" : "Match →",
        href: hasPriceIntent ? "/price-today" : "/rfq/general",
        active: hasPriceIntent,
        hint: hasPriceIntent
          ? "Recent activity suggests price discovery"
          : "Find matching vendors and responses",
      },
      {
        label: "Quote →",
        href: "/dashboard/buyer",
        active: pathname.includes("/dashboard/buyer"),
        hint: "Compare quotations and buyer activity",
      },
      {
        label: hasChatIntent ? "Continue Chat →" : "Chat →",
        href: "/dashboard/inbox",
        active: hasChatIntent,
        hint: "Open unified inbox and conversations",
      },
      {
        label: "Close",
        href: "/dashboard",
        active: pathname === "/dashboard",
        hint: locationText
          ? `Workflow tuned for ${locationText}`
          : "Track work and dashboard activity",
      },
    ];
  }, [heroSearch, recentSearches, pathname, locationText]);

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
      <Container style={{ maxWidth: "100%", padding: "0 24px" }}>
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
            zIndex: 1,
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
                "repeat(auto-fit, minmax(min(100%, 460px), 1fr))",
              gap: 16,
              padding: "16px",
              alignItems: "stretch",
              position: "relative",
            }}
          >
            <div
              className="homeHeroMain"
              style={{
                color: "#fff",
                minWidth: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="heroLogoFull" style={{ marginBottom: 10 }}>
                <img
                  src="/logo.png"
                  alt="3Bigha"
                  style={{
                    width: "100%",
                    maxWidth: 260,
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
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.20)",
                  border: "1px solid rgba(255,255,255,0.34)",
                  fontWeight: 900,
                  fontSize: 11,
                  color: "#ffffff",
                  letterSpacing: "0.02em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.2)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
                  maxWidth: "100%",
                  whiteSpace: "normal",
                  lineHeight: 1.3,
                }}
              >
                AI workflow
              </div>

              <div style={{ marginTop: 10, maxWidth: "100%", width: "100%" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(22px, 5.2vw, 36px)",
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
                    marginTop: 8,
                    marginBottom: 0,
                    fontSize: "clamp(14px, 3.8vw, 17px)",
                    lineHeight: 1.35,
                    fontWeight: 800,
                    color: "rgba(255,255,255,0.98)",
                    maxWidth: 720,
                    textShadow: "0 1px 8px rgba(0,0,0,0.14)",
                  }}
                >
                  Search, RFQ, price compare, chat and local opportunity workflow.
                </p>
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#ffffff",
                  fontSize: "clamp(13px, 3.5vw, 15px)",
                  lineHeight: 1.35,
                  fontWeight: 700,
                  maxWidth: 920,
                  textShadow: "0 1px 8px rgba(0,0,0,0.16)",
                }}
              >
                AI-assisted discovery for property, materials, services, rentals and investment.
              </div>

              <div
                style={{
                  marginTop: 10,
                  maxWidth: "100%",
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
                    alignItems: "center",
                    background: "rgba(0,0,0,0.25)",
                    padding: "8px",
                    borderRadius: 12,
                    backdropFilter: "blur(6px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    position: "relative",
                    zIndex: 10,
                  }}
                >
                  <select
                    value={searchModule}
                    onChange={(e) => setSearchModule(e.target.value)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "rgba(0,0,0,0.35)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    <option value="property">Property</option>
                    <option value="materials">Materials</option>
                    <option value="services">Services</option>
                    <option value="rentals">Rentals</option>
                    <option value="investment">Investment</option>
                  </select>

                  <div
                    style={{
                      position: "relative",
                      flex: "1 1 260px",
                      minWidth: 220,
                    }}
                  >
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
                      placeholder="Type your requirement... (e.g. 500 cement bags urgent)"
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.25)",
                        outline: "none",
                        background: "rgba(0,0,0,0.35)",
                        color: "#fff",
                        fontSize: 14,
                      }}
                    />

                    {showSuggestions ? (
                      <div
                        style={{
                          ...suggestionBoxStyle,
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          left: 0,
                          right: 0,
                          marginTop: 0,
                          zIndex: 50,
                        }}
                      >
                        {heroSearch.length > 1 ? (
                          filteredSuggestions.length > 0 ? (
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
                          )
                        ) : recentSearches.length > 0 ? (
                          <>
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
                          </>
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>

                  {aiCommandPreview ? (
                    <div
                      style={{
                        flex: "1 1 100%",
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "rgba(34,197,94,0.18)",
                        border: "1px solid rgba(34,197,94,0.35)",
                        color: "#dcfce7",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      🤖 {aiCommandPreview.label}
                      {heroSearch.match(/\d+/) ? " • Qty detected" : ""}
                      {heroSearch.toLowerCase().includes("cement") ? " • Cement" : ""}
                      {heroSearch.toLowerCase().includes("steel") ? " • Steel" : ""}
                      {heroSearch.toLowerCase().includes("sand") ? " • Sand" : ""}
                      → Enter to proceed
                    </div>
                  ) : null}

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
                      padding: "12px 12px",
                      borderRadius: 10,
                      border: "none",
                      background: "#22c55e",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    🎤 Speak
                  </button>

                  <button
                    type="button"
                    onClick={() => runHeroSearch(heroSearch)}
                    style={{
                      padding: "12px 18px",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 6px 18px rgba(239,68,68,0.4)",
                    }}
                  >
                    Run AI
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 900,
                      color: "#fff",
                      marginRight: 4,
                    }}
                  >
                    Start workflow
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
                <div
                  style={{
                    marginTop: 12,
                    borderRadius: 18,
                    background: "#ffffff",
                    padding: 14,
                    color: "#0f172a",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
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
                    AI WORKFLOW ENGINE
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 18,
                      fontWeight: 900,
                      lineHeight: 1.35,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {dynamicWorkflowSteps.map((step) => (
                      <button
                        key={step.label}
                        type="button"
                        title={step.hint}
                        onClick={() => router.push(step.href)}
                        style={{
                          border: "none",
                          background: step.active ? "rgba(11,87,208,0.10)" : "transparent",
                          padding: step.active ? "2px 7px" : 0,
                          borderRadius: 999,
                          cursor: "pointer",
                          color: step.active ? "#dc2626" : "#0b57d0",
                          font: "inherit",
                        }}
                      >
                        {step.label}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: "#475569",
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    Direct flow from requirement to vendor response, chat and deal closure.
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    background: "rgba(255,255,255,0.96)",
                    borderRadius: 18,
                    padding: 16,
                    color: "#0f172a",
                    boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 950,
                      fontSize: 18,
                      lineHeight: 1.3,
                    }}
                  >
                    ✍️ Submit Requirement (RFQ)
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#475569",
                      lineHeight: 1.55,
                      fontSize: 14,
                    }}
                  >
                    Type your need or upload a list. AI helps prepare the RFQ
                    and nearby vendors can respond with quotations.
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={chipStyle}>🤖 AI RFQ draft</span>
                    <span style={chipStyle}>📍 Nearby vendors</span>
                    <span style={chipStyle}>💬 Unified chat</span>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <ActionButton href="/rfq/general/new" variant="primary" fullWidth>
                      Submit →
                    </ActionButton>

                    <div
                      style={{
                        minHeight: 40,
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.10)",
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
                        minHeight: 40,
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.10)",
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
            </div>

            <div
              className="homeHeroSide"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "stretch",
                minWidth: 0,
                height: "100%",
              }}
            >
              <div
                style={{
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  padding: 12,
                  backdropFilter: "blur(8px)",
                  display: "grid",
                  gridTemplateRows: "auto auto 1fr",
                  alignContent: "stretch",
                  gap: 12,
                  height: "100%",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push("/price-today")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      runHeroSearch(heroSearch);
                    }
                  }}
                  style={{
                    borderRadius: 20,
                    background:
                      "linear-gradient(135deg, #f97316 0%, #dc2626 55%, #7c2d12 100%)",
                    transition: "all 0.25s ease",
                    padding: 16,
                    color: "#ffffff",
                    boxShadow: "0 16px 36px rgba(220,38,38,0.34)",
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      opacity: 0.95,
                    }}
                  >
                    PRICE TODAY
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 21,
                      fontWeight: 950,
                      lineHeight: 1.25,
                    }}
                  >
                    Check material & property price trends
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      lineHeight: 1.5,
                      opacity: 0.94,
                      fontWeight: 700,
                    }}
                  >
                    Cement, steel, sand, aggregate, brick, land and per sq.ft.
                    market indication.
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
                  {[
                    {
                      icon: "📍",
                      title: "Local discovery",
                      text: "Nearby search and district-focused onboarding.",
                      href: "/search?module=property&q=near%20me",
                    },
                    {
                      icon: "🧾",
                      title: "Requirement to quote",
                      text: "Submit needs and receive competitive responses.",
                      href: "/rfq/general/new",
                    },
                    {
                      icon: "🤝",
                      title: "Business networking",
                      text: "Connect vendors, owners, builders, buyers and investors.",
                      href: "/dashboard/inbox",
                    },
                    {
                      icon: "🤖",
                      title: "AI-assisted matching",
                      text: "Help users reach the right listing, vendor or service faster.",
                      href: "/search?module=property&q=ai%20match",
                    },
                    {
                      icon: "🗺️",
                      title: "Local-first discovery",
                      text: "Find local property, materials, services and rentals.",
                      href: "/search?module=property&q=local",
                    },
                    {
                      icon: "✅",
                      title: "Verified businesses",
                      text: "Discover trusted local businesses and providers.",
                      href: "/search?module=services&q=verified%20business",
                    },
                    {
                      icon: "💬",
                      title: "RFQ + unified chat",
                      text: "Manage quotations and messages in one flow.",
                      href: "/dashboard/inbox",
                    },
                    {
                      icon: "📈",
                      title: "Local investment growth",
                      text: "Explore local investment opportunities.",
                      href: "/investment",
                    },
                  ].map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      className="homeHeroFeatureCard"
                      style={{
                        ...featureCardStyle,
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{item.icon}</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontWeight: 900,
                          color: "#0f172a",
                          fontSize: 16,
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          color: "#475569",
                          fontSize: 14,
                          lineHeight: 1.55,
                        }}
                      >
                        {item.text}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

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
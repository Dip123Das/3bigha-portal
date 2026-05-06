"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type SearchKind = "property" | "materials" | "services" | "rentals" | "blog";

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; lat: number; lng: number; accuracy?: number | null }
  | { status: "error"; message: string };

function safeStr(v: unknown) {
  return String(v ?? "").trim();
}

function buildQuery(params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    const s = safeStr(v);
    if (s) sp.set(k, s);
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

function getBasePath(kind: SearchKind) {
  if (kind === "property") return "/property";
  if (kind === "materials") return "/materials";
  if (kind === "services") return "/services";
  if (kind === "rentals") return "/rentals";
  return "/blog";
}

// Web Speech API (Chrome/Edge)
function createSpeechRecognition(): any | null {
  const w = typeof window !== "undefined" ? (window as any) : null;
  const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

export default function GlobalHeaderClient() {
  const router = useRouter();
  const pathname = usePathname();

  // Active link highlighting uses data-path on <html>
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-path", pathname || "/");
    } catch {}
  }, [pathname]);

  // Search state
  const [kind, setKind] = useState<SearchKind>("property");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");

  // Optional quick filters (basic now)
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  // Location
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  async function useMyLocation() {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setGeo({ status: "error", message: "Geolocation not supported in this browser." });
      return;
    }
    setGeo({ status: "loading" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGeo({
          status: "ready",
          lat,
          lng,
          accuracy: typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null,
        });
      },
      (err) => {
        setGeo({ status: "error", message: err?.message || "Failed to fetch location." });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30_000 }
    );
  }

  function clearLocation() {
    setGeo({ status: "idle" });
  }

  // Voice search
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any | null>(null);

  useEffect(() => {
    const rec = createSpeechRecognition();
    recogRef.current = rec;
    setVoiceSupported(!!rec);
    return () => {
      try {
        rec?.stop?.();
      } catch {}
    };
  }, []);

  function startVoice() {
    const rec = recogRef.current;
    if (!rec) return;

    try {
      setListening(true);
      rec.lang = "en-IN"; // you can change later (bn-IN, hi-IN etc.)
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        const last = event.results?.[event.results.length - 1];
        const transcript = last?.[0]?.transcript ? String(last[0].transcript) : "";
        if (transcript) setQ(transcript);
        // If final result, stop
        const isFinal = !!last?.isFinal;
        if (isFinal) {
          try {
            rec.stop();
          } catch {}
          setListening(false);
        }
      };

      rec.onerror = () => {
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
      };

      rec.start();
    } catch {
      setListening(false);
    }
  }

  function stopVoice() {
    const rec = recogRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }

  function onSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();

    const base = getBasePath(kind);

    // We pass filters as query params (even if some pages don’t use them yet).
    // Later, you can wire them into each listing page easily.
    const near =
      geo.status === "ready" ? `${geo.lat.toFixed(6)},${geo.lng.toFixed(6)}` : "";

    const qs = buildQuery({
      q: q || null,
      city: city || null,
      locality: locality || null,
      min: minBudget || null,
      max: maxBudget || null,
      near: near || null,
    });

    router.push(`${base}${qs}`);
  }

  const nearLabel = useMemo(() => {
    if (geo.status === "idle") return "";
    if (geo.status === "loading") return "Locating…";
    if (geo.status === "error") return "Location error";
    return "Near me ON";
  }, [geo.status]);

  return (
    <div className="topHeaderShell">
      <div className="container headerInnerPro">
        {/* Brand */}
        <div className="brandPro">
          <Link href="/" className="brandLink">
            <div className="brandName">3Bigha.com</div>
            <div className="brandTagline">Real Estate Platform</div>
          </Link>
        </div>

        {/* Main nav */}
        <nav className="topNav">
          <Link className="topNavLink" data-match="/property" href="/property">
            Property
          </Link>
          <Link className="topNavLink" data-match="/materials" href="/materials">
            Materials
          </Link>
          <Link className="topNavLink" data-match="/services" href="/services">
            Services
          </Link>
          <Link className="topNavLink" data-match="/rentals" href="/rentals">
            Rentals
          </Link>
          <Link className="topNavLink" data-match="/blog" href="/blog">
            Blog
          </Link>

          <Link className="topNavLink" data-match="/support" href="/support/my">
            Support
          </Link>
        </nav>

        {/* Smart Search */}
        <form className="smartSearch" onSubmit={onSearchSubmit}>
          <select
            className="smartSelect"
            value={kind}
            onChange={(e) => setKind(e.target.value as SearchKind)}
            aria-label="Search type"
          >
            <option value="property">Property</option>
            <option value="materials">Materials</option>
            <option value="services">Services</option>
            <option value="rentals">Rentals</option>
            <option value="blog">Blog</option>
          </select>

          <input
            className="smartInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            aria-label="Search text"
          />

          {/* Quick filters */}
          <input
            className="smartMini"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            aria-label="City"
          />
          <input
            className="smartMini"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder="Locality"
            aria-label="Locality"
          />

          <input
            className="smartMini"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="Min ₹"
            inputMode="numeric"
            aria-label="Minimum budget"
          />
          <input
            className="smartMini"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="Max ₹"
            inputMode="numeric"
            aria-label="Maximum budget"
          />

          {/* Near me */}
          <button
            type="button"
            className={`smartPill ${geo.status === "ready" ? "isOn" : ""}`}
            onClick={() => (geo.status === "ready" ? clearLocation() : useMyLocation())}
            title="Use my location to find nearby listings"
          >
            📍 {nearLabel || "Near me"}
          </button>

          {/* Voice */}
          {voiceSupported ? (
            <button
              type="button"
              className={`smartPill ${listening ? "isOn" : ""}`}
              onClick={() => (listening ? stopVoice() : startVoice())}
              title="Voice search"
            >
              🎤 {listening ? "Listening…" : "Voice"}
            </button>
          ) : null}

          <button type="submit" className="smartBtnPrimary">
            Search
          </button>
        </form>

        {/* Right actions (static for now; we can wire session later) */}
        <div className="rightActions">
          <Link className="btnGhost" href="/dashboard">
            Dashboard
          </Link>

          <Link className="btnGhost" href="/support/my">
            Support
          </Link>

          {/* This will become your mega “Post / List” menu later */}
          <Link className="btnPrimary" href="/dashboard">
            Post / List
          </Link>

          <Link className="btnGhost" href="/login">
            Login
          </Link>
        </div>
      </div>

      <div className="topSubBar">
        <div className="container subInner">
          <div className="subLeft">
            Browse verified listings • Compare rates • Contact vendors • Track enquiries
          </div>
          <div className="subRight">
            <Link className="subLink" href="/dashboard/buyer/enquiries">
              My Enquiries
            </Link>
            <Link className="subLink" href="/dashboard/vendor/enquiries">
              Vendor Inbox
            </Link>
            <Link className="subLink" href="/support/my">
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import GeoSelector, { type GeoSelection } from "@/components/geography/GeoSelector";
import { resolveCustomerLgd } from "@/lib/geography/customerLgd";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "";
  }

  return raw;
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export default function CustomerOnboardingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  const returnTo =
    safeNextPath(searchParams.get("returnTo")) ||
    "/dashboard";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [stateName, setStateName] = useState("");
  const [districtName, setDistrictName] =
    useState("");
  const [officialArea, setOfficialArea] = useState<GeoSelection>({});
  const [pincode, setPincode] = useState("");
  const [saving, setSaving] = useState(false);
  const [nearby, setNearby] = useState<string[] | null>(null);
  const [nearbyMessage, setNearbyMessage] = useState("");
  const [searchingNearby, setSearchingNearby] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;

      const user = data.user;

      if (!user) {
        router.replace(
          `/login?next=${encodeURIComponent(
            "/onboarding/customer"
          )}`
        );
        return;
      }

      setFullName(
        String(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            ""
        )
      );

      setPhone(
        String(
          user.user_metadata?.phone ||
            user.phone ||
            ""
        )
      );

      supabase
        .from("profiles")
        .select(
          "full_name,phone,state,city,pincode,lgd_state_code,lgd_district_code"
        )
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!alive || !profile) return;

          setFullName(
            String(
              profile.full_name ||
                user.user_metadata?.full_name ||
                ""
            )
          );

          setPhone(
            String(
              profile.phone ||
                user.phone ||
                ""
            )
          );

          setStateName(
            String(profile.state || "")
          );

          setDistrictName(String(profile.city || ""));
          setPincode(String(profile.pincode || ""));
        });
    });

    return () => {
      alive = false;
    };
  }, [router, supabase]);

  async function findNearbyVendors() {
    setSearchingNearby(true);
    setNearby(null);
    setNearbyMessage("");
    try {
      if (!navigator.geolocation) throw new Error();
      const { coords } = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      const query = new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude), limit: "5" });
      const response = await fetch("/api/nearby/vendors?" + query);
      if (!response.ok) throw new Error();
      const data = await response.json() as { results: { business_name: string | null }[] };
      setNearby(data.results.flatMap(({ business_name }) => business_name ? [business_name] : []));
    } catch {
      setNearbyMessage("Nearby vendors could not be loaded. You can still continue signing up.");
    } finally {
      setSearchingNearby(false);
    }
  }

  async function completeCustomerSetup(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!fullName.trim()) {
      setMessage("Enter your full name.");
      return;
    }

    if (normalizePhone(phone).length < 10) {
      setMessage(
        "Enter a valid mobile number."
      );
      return;
    }

    if (!stateName.trim()) {
      setMessage("Enter your State.");
      return;
    }

    if (!districtName.trim()) {
      setMessage("Enter your District or City.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const area = officialArea.state && officialArea.district
        ? await resolveCustomerLgd(supabase, Number(officialArea.state.id), Number(officialArea.district.id))
        : null;
      if (officialArea.state && officialArea.district && !area) {
        throw new Error("Select a district in the chosen official state.");
      }

      const now = new Date().toISOString();

      const { error: authError } =
        await supabase.auth.updateUser({
          data: {
            ...(user.user_metadata || {}),
            registration_path: "customer",
            member_identity_status: "declared",
            primary_human_identity: "customer",
            human_identities: ["customer"],
            operating_profile:
              "individual_professional",
            human_identity_label:
              "Customer / Buyer",
            human_identity_local_label:
              "Customer / Buyer",
            human_identity_declared_at: now,
            professional_verification_required:
              false,
          },
        });

      if (authError) {
        throw authError;
      }

      const { error: profileError } =
        await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              email: user.email || null,
              full_name: fullName.trim(),
              phone: normalizePhone(phone),
              state: stateName.trim(),
              city: districtName.trim(),
              ...(area ?? {}),
              pincode:
                pincode.trim() || null,
              portal_use_reason:
                "buy_property_or_materials",
              role_display_label:
                "Customer / Buyer",
              onboarding_version: 4,
              onboarding_completed: true,
            },
            {
              onConflict: "id",
            }
          );

      if (profileError) {
        throw profileError;
      }

      const { error: declarationError } =
        await supabase.rpc(
          "declare_operating_profile",
          {
            p_operating_profile:
              "individual_professional",
            p_identity_keys: ["customer"],
            p_primary_identity_key:
              "customer",
          }
        );

      if (declarationError) {
        throw declarationError;
      }

      const { error: grantsError } =
        await supabase.rpc(
          "sync_member_module_grants"
        );

      if (grantsError) {
        throw grantsError;
      }

      router.replace(returnTo);
    } catch (error: any) {
      setMessage(
        error?.message ||
          "Customer setup could not be completed."
      );
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <form
        onSubmit={completeCustomerSetup}
        style={formStyle}
      >
        <div style={eyebrowStyle}>
          Quick customer setup
        </div>

        <h1 style={headingStyle}>
          Start buying and hiring
        </h1>

        <p style={introStyle}>
          Customers do not need business proof, work
          photographs or professional verification.
        </p>

        <label style={labelStyle}>
          Full Name *
          <input
            value={fullName}
            onChange={(event) =>
              setFullName(event.target.value)
            }
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Mobile Number *
          <input
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            inputMode="tel"
            style={inputStyle}
          />
        </label>

        <details>
          <summary>Choose official area (LGD)</summary>
          <GeoSelector value={officialArea} includeSubdivision={false} includeBlock={false} includePlace={false}
            disabled={saving} onChange={(selection) => {
              setOfficialArea(selection);
              setStateName(selection.state?.name ?? "");
              setDistrictName(selection.district?.name ?? "");
            }} />
        </details>

        <div style={twoColumnStyle}>
          <label style={labelStyle}>
            State *
            <input
              value={stateName}
              onChange={(event) => {
                setOfficialArea({});
                setStateName(event.target.value);
                setDistrictName("");
              }}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            District / City *
            <input
              value={districtName}
              onChange={(event) => {
                setOfficialArea((area) => ({ state: area.state }));
                setDistrictName(event.target.value);
              }}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={labelStyle}>
          PIN Code
          <input
            value={pincode}
            onChange={(event) =>
              setPincode(event.target.value)
            }
            inputMode="numeric"
            style={inputStyle}
          />
        </label>

        {stateName.trim() && districtName.trim() ? (
          <a href={"https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent([districtName.trim(), stateName.trim(), "India"].join(", "))}
            target="_blank" rel="noopener noreferrer">View this area in Google Maps</a>
        ) : null}

        <button type="button" disabled={searchingNearby || saving} onClick={() => void findNearbyVendors()}>
          {searchingNearby ? "Finding nearby vendors…" : "Find vendors near my current location"}
        </button>
        <div aria-live="polite">
          {nearbyMessage || (nearby && (nearby.length ? <ul>{nearby.map((name, index) =>
            <li key={index}>{name}</li>)}</ul> : "No nearby vendors found."))}
        </div>

        <div style={locationNoteStyle}>
          Your exact delivery or service address will be
          requested only when it is genuinely needed—for
          example, while submitting an RFQ, placing an
          order or arranging delivery.
        </div>

        {message ? (
          <div role="alert" style={messageStyle}>
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          style={{
            ...submitStyle,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving
            ? "Preparing your customer account…"
            : "Continue to 3Bigha"}
        </button>
      </form>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "38px 18px",
  background: "#f8fafc",
};

const formStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "0 auto",
  display: "grid",
  gap: 15,
  padding: 22,
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  background: "white",
  boxShadow:
    "0 16px 42px rgba(15,23,42,.07)",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".06em",
  textTransform: "uppercase",
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 29,
};

const introStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  lineHeight: 1.55,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  font: "inherit",
};

const twoColumnStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(220px,1fr))",
  gap: 12,
};

const locationNoteStyle: React.CSSProperties = {
  padding: 11,
  border: "1px solid #bfdbfe",
  borderRadius: 10,
  background: "#eff6ff",
  color: "#1e3a8a",
  lineHeight: 1.5,
};

const messageStyle: React.CSSProperties = {
  padding: 11,
  border: "1px solid #fca5a5",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
  fontWeight: 800,
};

const submitStyle: React.CSSProperties = {
  padding: "12px 15px",
  border: 0,
  borderRadius: 10,
  background: "#1d4ed8",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

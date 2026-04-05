"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type PortalRole =
  | "buyer"
  | "vendor"
  | "builder"
  | "hub_vendor"
  | "blogger";

type VendorCapability =
  | "materials"
  | "services"
  | "rentals"
  | "property_owner"
  | "property_builder"
  | "blog_author"
  | "investor";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

export default function RegisterRolePage() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const next = safeNextPath(sp.get("next"));

  const [role, setRole] = useState<PortalRole | "">("");
  const [caps, setCaps] = useState<VendorCapability[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function toggleCap(cap: VendorCapability) {
    setCaps((prev) =>
      prev.includes(cap) ? prev.filter((x) => x !== cap) : [...prev, cap]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      setMsg("Please choose your role.");
      return;
    }

    if (role === "vendor" && caps.length === 0) {
      setMsg("Please choose at least one vendor capability.");
      return;
    }

    if (role === "buyer" && caps.length === 0) {
      setCaps(["investor"]);
    }

    setLoading(true);
    setMsg("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;

      if (!user?.id) {
        setMsg("No active session found. Please login again.");
        setLoading(false);
        return;
      }

      const isVendor = role === "vendor" || role === "hub_vendor";

      const profilePayload: Record<string, any> = {
        id: user.id,
        email: user.email ?? null,
        full_name: fullName || null,
        phone: phone || null,
        requested_role: role,
        approval_status: "pending",
        is_vendor: isVendor,
      };

      if (role === "hub_vendor") {
        profilePayload.role = null;
      } else if (role === "builder") {
        profilePayload.role = null;
      } else if (role === "buyer") {
        profilePayload.role = null;
      } else if (role === "blogger") {
        profilePayload.role = null;
      } else {
        profilePayload.role = null;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileError) {
        setMsg(profileError.message || "Could not save registration.");
        setLoading(false);
        return;
      }

      if (role === "vendor") {
        const capabilityRows = caps.map((cap) => ({
          user_id: user.id,
          module_key: cap,
          is_active: true,
        }));

        await supabase
          .from("vendor_module_grants")
          .delete()
          .eq("user_id", user.id);

        const { error: grantsError } = await supabase
          .from("vendor_module_grants")
          .insert(capabilityRows);

        if (grantsError) {
          setMsg(grantsError.message || "Could not save vendor capabilities.");
          setLoading(false);
          return;
        }
      }

      if (role === "hub_vendor") {
        const capabilityRows = [
          "materials",
          "services",
          "rentals",
          "property_owner",
          "property_builder",
          "blog_author",
        ].map((cap) => ({
          user_id: user.id,
          module_key: cap,
          is_active: true,
        }));

        await supabase
          .from("vendor_module_grants")
          .delete()
          .eq("user_id", user.id);

        const { error: grantsError } = await supabase
          .from("vendor_module_grants")
          .insert(capabilityRows);

        if (grantsError) {
          setMsg(grantsError.message || "Could not save hub vendor capabilities.");
          setLoading(false);
          return;
        }
      }

      if (role === "buyer") {
        await supabase
          .from("vendor_module_grants")
          .delete()
          .eq("user_id", user.id);
      }

      if (role === "builder") {
        await supabase
          .from("vendor_module_grants")
          .delete()
          .eq("user_id", user.id);

        await supabase
          .from("vendor_module_grants")
          .insert([
            {
              user_id: user.id,
              module_key: "property_builder",
              is_active: true,
            },
          ]);
      }

      if (role === "blogger") {
        await supabase
          .from("vendor_module_grants")
          .delete()
          .eq("user_id", user.id);

        await supabase
          .from("vendor_module_grants")
          .insert([
            {
              user_id: user.id,
              module_key: "blog_author",
              is_active: true,
            },
          ]);
      }

      router.replace("/auth/awaiting-approval");
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 24,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>
          Complete Your Registration
        </div>

        <div style={{ opacity: 0.8, marginBottom: 20 }}>
          Choose your role and complete the onboarding request. Access will be enabled after approval.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Full Name</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #dbe0e6",
                padding: "10px 12px",
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Phone</div>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #dbe0e6",
                padding: "10px 12px",
              }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Choose Role</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["buyer", "Buyer"],
                ["vendor", "Vendor"],
                ["builder", "Builder"],
                ["hub_vendor", "HUB Vendor"],
                ["blogger", "Blogger / Author"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value as PortalRole)}
                  />
                  <span style={{ fontWeight: 700 }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {role === "vendor" ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Choose Vendor Capabilities
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  ["materials", "Materials Vendor"],
                  ["services", "Services Vendor"],
                  ["rentals", "Rentals Vendor"],
                  ["property_owner", "Property Owner"],
                  ["property_builder", "Property Builder"],
                  ["blog_author", "Blog Author"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={caps.includes(value as VendorCapability)}
                      onChange={() => toggleCap(value as VendorCapability)}
                    />
                    <span style={{ fontWeight: 700 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {msg ? (
            <div
              style={{
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#9f1239",
                borderRadius: 10,
                padding: 10,
                fontSize: 14,
              }}
            >
              {msg}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>

            {next ? (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Requested return path: {next}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </main>
  );
}
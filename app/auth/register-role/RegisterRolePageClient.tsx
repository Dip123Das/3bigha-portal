"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { trackVendorConversionClient } from "@/components/marketplace/vendor-conversion-client";

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

type UseReason =
  | "buy_property_or_materials"
  | "sell_materials"
  | "offer_services"
  | "provide_rentals"
  | "list_property_for_sale"
  | "manage_builder_projects"
  | "operate_multiple_businesses"
  | "invest_in_opportunities"
  | "publish_blog_or_news";

function safeNextPath(raw: string | null) {
  if (!raw) return "";
  if (!raw.startsWith("/")) return "";
  if (raw.startsWith("//")) return "";
  return raw;
}

function goesToBusinessOnboarding(role: PortalRole | "") {
  return (
    role === "vendor" ||
    role === "builder" ||
    role === "hub_vendor" ||
    role === "blogger"
  );
}

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "").trim();
}

function getRoleDisplayLabel(
  role: PortalRole,
  caps: VendorCapability[]
): string {
  if (role === "buyer") return "Buyer";
  if (role === "builder") return "Builder / Developer";
  if (role === "hub_vendor") return "Vendor Hub";
  if (role === "blogger") return "Blogger / Author";

  if (role === "vendor") {
    if (caps.length === 1) {
      const c = caps[0];
      if (c === "materials") return "Materials Vendor";
      if (c === "services") return "Service Vendor";
      if (c === "rentals") return "Rental Vendor";
      if (c === "property_owner") return "Property Vendor / Seller";
      if (c === "property_builder") return "Builder / Developer";
      if (c === "blog_author") return "Blogger / Author";
      if (c === "investor") return "Investor";
    }

    return caps.includes("investor") ? "Multi-Service Vendor / Investor" : "Multi-Service Vendor";
  }

  return "User";
}

export default function RegisterRolePageClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const next = safeNextPath(sp.get("next"));
  const preselectedRole = (sp.get("role") || "").trim().toLowerCase();
  const isMasterAdminRequest = preselectedRole === "master_admin";

  useEffect(() => {
    // Master admin must not repeatedly auto-redirect from register-role.
    // Post-login and dashboard routing will handle the correct destination.
  }, []);

  const [role, setRole] = useState<PortalRole | "">(
    ["buyer", "vendor", "builder", "hub_vendor", "blogger"].includes(
      preselectedRole
    )
      ? (preselectedRole as PortalRole)
      : ""
  );
  const [caps, setCaps] = useState<VendorCapability[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [useReason, setUseReason] = useState<UseReason | "">("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    trackVendorConversionClient({
      eventType: "registration_started",
      source: "register_role_page",
      label: "Vendor Registration Started",
      metadata: {
        preselectedRole,
      },
    });
  }, [preselectedRole]);


  if (isMasterAdminRequest) {
    return (
      <main style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>
          Master Admin access is already configured.
        </div>
        <div style={{ marginTop: 8, opacity: 0.75 }}>
          Open the admin dashboard from the button below.
        </div>
        <a
          href="/admin/dashboard"
          style={{
            display: "inline-flex",
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 10,
            background: "#2563eb",
            color: "white",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Open Master Admin Dashboard
        </a>
      </main>
    );
  }

  function toggleCap(cap: VendorCapability) {
    setCaps((prev) =>
      prev.includes(cap) ? prev.filter((x) => x !== cap) : [...prev, cap]
    );
  }

  function validateForm() {
    const trimmedName = fullName.trim();
    const trimmedPhone = normalizePhone(phone);
    const trimmedCity = city.trim();
    const trimmedState = stateName.trim();

    if (!role) return "Please choose your role.";
    if (!trimmedName) return "Please enter your full name.";
    if (!trimmedPhone || trimmedPhone.length < 10)
      return "Please enter a valid phone number.";
    if (!trimmedCity) return "Please enter your city.";
    if (!trimmedState) return "Please enter your state.";
    if (!useReason) return "Please tell us why you want to use 3bigha.";
    if (role === "vendor" && caps.filter((x) => x !== "investor").length === 0)
      return "Please choose at least one vendor capability.";

    return "";
  }

  async function saveModuleGrants(userId: string, selectedRole: PortalRole) {
    await supabase.from("vendor_module_grants").delete().eq("user_id", userId);

    if (selectedRole === "buyer") {
      return { error: null as any };
    }

    if (selectedRole === "vendor") {
      const capabilityRows = caps.map((cap) => ({
        user_id: userId,
        module_key: cap,
        is_active: true,
      }));

      if (capabilityRows.length === 0) {
        return { error: null as any };
      }

      const { error } = await supabase
        .from("vendor_module_grants")
        .insert(capabilityRows);

      return { error };
    }

    if (selectedRole === "builder") {
      const { error } = await supabase.from("vendor_module_grants").insert([
        {
          user_id: userId,
          module_key: "property_builder",
          is_active: true,
        },
      ]);
      return { error };
    }

    if (selectedRole === "blogger") {
      const { error } = await supabase.from("vendor_module_grants").insert([
        {
          user_id: userId,
          module_key: "blog_author",
          is_active: true,
        },
      ]);
      return { error };
    }

    if (selectedRole === "hub_vendor") {
      const capabilityRows = [
        "materials",
        "services",
        "rentals",
        "property_owner",
        "property_builder",
        "blog_author",
        "investor",
      ].map((cap) => ({
        user_id: userId,
        module_key: cap,
        is_active: true,
      }));

      const { error } = await supabase
        .from("vendor_module_grants")
        .insert(capabilityRows);

      return { error };
    }

    return { error: null as any };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setMsg(validationError);
      return;
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

      const isVendor =
        role === "vendor" ||
        role === "hub_vendor" ||
        role === "builder" ||
        role === "blogger";

      const roleDisplayLabel = getRoleDisplayLabel(role as PortalRole, caps);

      const profilePayload: Record<string, any> = {
        id: user.id,
        email: user.email ?? null,
        full_name: fullName.trim() || null,
        phone: normalizePhone(phone) || null,
        city: city.trim() || null,
        state: stateName.trim() || null,
        requested_role: role,
        role: role,
        approval_status: "active",
        is_vendor: isVendor,
        onboarding_version: 2,
        onboarding_completed: !goesToBusinessOnboarding(role),
        portal_use_reason: useReason,
        role_display_label: roleDisplayLabel,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (profileError) {
        setMsg(profileError.message || "Could not save registration.");
        setLoading(false);
        return;
      }

      const { error: grantsError } = await saveModuleGrants(
        user.id,
        role as PortalRole
      );

      if (grantsError) {
        setMsg(grantsError.message || "Could not save module access.");
        setLoading(false);
        return;
      }

      if (goesToBusinessOnboarding(role)) {
        const businessPayload = {
          user_id: user.id,
          business_name: null,
          business_type:
            role === "builder"
              ? "builder"
              : role === "hub_vendor"
              ? "hub"
              : role === "blogger"
              ? "blogger"
              : "vendor",
          nature_of_business:
            role === "builder"
              ? ["property"]
              : role === "hub_vendor"
              ? ["property", "materials", "services", "rentals", "blog"]
              : role === "blogger"
              ? ["blog"]
              : caps,
          gstin: null,
          trade_license_no: null,
          contact_person: fullName.trim() || null,
          phone_primary: normalizePhone(phone) || null,
          city: city.trim() || null,
          state: stateName.trim() || null,
          address_line1: null,
          pincode: null,
        };

        const { error: businessError } = await supabase
          .from("business_profiles")
          .upsert(businessPayload, { onConflict: "user_id" });

        if (!businessError) {
          trackVendorConversionClient({
            eventType: "registration_completed",
            source: "register_role_page",
            label: "Vendor Registration Completed",
            metadata: {
              role,
              capabilities: caps,
            },
          });
        }

        if (businessError) {
          setMsg(businessError.message || "Could not save business profile.");
          setLoading(false);
          return;
        }

        const qs = new URLSearchParams();
        qs.set("returnTo", next || "/dashboard");
        qs.set("role", role);
        router.replace(`/onboarding/business?${qs.toString()}`);
        return;
      }

      router.replace(next || "/dashboard");
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px 20px" }}>
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 12,
          padding: 24,
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          Complete Your Registration
        </div>

        <div style={{ opacity: 0.8, marginBottom: 20 }}>
          Tell us who you are and why you want to use 3bigha. If your role needs
          business setup, you will be guided to the next step automatically.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Full Name *</div>
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
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Phone *</div>
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

          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>City *</div>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #dbe0e6",
                  padding: "10px 12px",
                }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>State *</div>
              <input
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="Your state"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #dbe0e6",
                  padding: "10px 12px",
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Who are you? *
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                {
                  value: "buyer",
                  label: "🏠 Buy Property / Materials",
                  desc: "Browse property, materials, services and rentals. Post RFQs and compare offers.",
                  caps: [],
                  reason: "buy_property_or_materials",
                },
                {
                  value: "vendor",
                  label: "🛒 Sell Materials",
                  desc: "List materials, receive buyer requirements and send quotations.",
                  caps: ["materials"],
                  reason: "sell_materials",
                },
                {
                  value: "vendor",
                  label: "👷 Provide Services",
                  desc: "Offer construction, repair, labour, technical or professional services.",
                  caps: ["services"],
                  reason: "offer_services",
                },
                {
                  value: "vendor",
                  label: "🚜 Offer Rentals",
                  desc: "List equipment, tools, vehicles or rental assets.",
                  caps: ["rentals"],
                  reason: "provide_rentals",
                },
                {
                  value: "builder",
                  label: "🏗 Builder / Developer",
                  desc: "List builder projects, manage inventory and receive buyer interest.",
                  caps: ["property_builder"],
                  reason: "manage_builder_projects",
                },
                {
                  value: "blogger",
                  label: "📰 Blogger / Publisher",
                  desc: "Publish blog, news, guides or marketplace content.",
                  caps: ["blog_author"],
                  reason: "publish_blog_or_news",
                },
                {
                  value: "hub_vendor",
                  label: "🏢 Multi-Business Vendor",
                  desc: "Operate property, materials, services, rentals and content from one account.",
                  caps: ["materials", "services", "rentals", "property_owner", "property_builder", "blog_author"],
                  reason: "operate_multiple_businesses",
                },
              ].map((item) => (
                <label
                  key={item.value}
                  style={{
                    display: "grid",
                    gap: 4,
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={item.value}
                      checked={role === item.value}
                      onChange={() => {
                        const nextCaps = (item.caps as VendorCapability[]) || [];
                        const keepInvestor = caps.includes("investor");
                        setRole(item.value as PortalRole);
                        setCaps(keepInvestor ? [...nextCaps, "investor"] : nextCaps);
                        setUseReason(item.reason as UseReason);
                      }}
                    />
                    <span style={{ fontWeight: 700 }}>{item.label}</span>
                  </div>

                  <div
                    style={{ fontSize: 13, opacity: 0.75, paddingLeft: 26 }}
                  >
                    {item.desc}
                  </div>
                </label>
              ))}
            </div>

            <label
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                border: "1px solid #fde68a",
                background: "#fffbeb",
                borderRadius: 12,
                padding: 12,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={caps.includes("investor")}
                onChange={() => toggleCap("investor")}
              />
              <span style={{ fontWeight: 800 }}>
                💰 I also want to explore investment opportunities
              </span>
            </label>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Why do you want to use 3bigha? *
            </div>

            <select
              value={useReason}
              onChange={(e) => setUseReason(e.target.value as UseReason)}
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #dbe0e6",
                padding: "10px 12px",
                background: "white",
              }}
            >
              <option value="">Select your purpose</option>
              <option value="buy_property_or_materials">
                To buy property or materials
              </option>
              <option value="sell_materials">To sell materials</option>
              <option value="offer_services">To offer services</option>
              <option value="provide_rentals">To provide rentals</option>
              <option value="list_property_for_sale">
                To list property for sale
              </option>
              <option value="manage_builder_projects">
                To manage builder projects
              </option>
              <option value="operate_multiple_businesses">
                To operate multiple businesses through one account
              </option>
              <option value="invest_in_opportunities">
                To invest in opportunities
              </option>
              <option value="publish_blog_or_news">
                To publish blog or news content
              </option>
            </select>
          </div>

          {role === "vendor" ? (
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Choose Your Vendor Type *
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  ["materials", "Materials Vendor"],
                  ["services", "Service Vendor"],
                  ["rentals", "Rental Vendor"],
                  ["property_owner", "Property Vendor / Seller"],
                  ["property_builder", "Builder / Developer"],
                  ["blog_author", "Blogger / Author"],
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

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
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
              {loading ? "Saving..." : "Continue"}
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
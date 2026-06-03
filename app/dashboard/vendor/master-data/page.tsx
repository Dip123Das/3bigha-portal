"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import UniversalDashboardShell from "@/components/operational/UniversalDashboardShell";

type AccessState = {
  loading: boolean;
  allowed: boolean;
  reason: string;
  businessName: string;
  plan: string;
  status: string;
  approval: string;
};

function isPaidActive(plan: string, status: string) {
  return String(status || "").toLowerCase() === "active" &&
    String(plan || "").toLowerCase() !== "free";
}

function isVerifiedVendor(approval: string) {
  const a = String(approval || "").toLowerCase();
  return a === "approved" || a === "verified";
}

function SimpleCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        background: "#ffffff",
        padding: 18,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 950,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: "6px 0 16px",
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6,
          fontWeight: 650,
        }}
      >
        {subtitle}
      </p>
      {children}
    </section>
  );
}

function WorkButton({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        border: "1px solid #dbeafe",
        background: "#f8fbff",
        borderRadius: 16,
        padding: 14,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div style={{ fontWeight: 950, color: "#1d4ed8", fontSize: 15 }}>
        {title}
      </div>
      <div
        style={{
          marginTop: 5,
          color: "#475569",
          fontSize: 13,
          lineHeight: 1.5,
          fontWeight: 650,
        }}
      >
        {detail}
      </div>
    </Link>
  );
}

export default function VendorMasterDataPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [access, setAccess] = useState<AccessState>({
    loading: true,
    allowed: false,
    reason: "",
    businessName: "",
    plan: "free",
    status: "free",
    approval: "",
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          if (!alive) return;
          setAccess({
            loading: false,
            allowed: false,
            reason: "Please login first to manage your product variations.",
            businessName: "",
            plan: "free",
            status: "free",
            approval: "",
          });
          return;
        }

        const { data: bp, error } = await supabase
          .from("business_profiles")
          .select("business_name,company_name,subscription_plan,subscription_status,approval_status,location_verification_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        const plan = String((bp as any)?.subscription_plan || "free");
        const status = String((bp as any)?.subscription_status || "free");
        const approval = String(
          (bp as any)?.approval_status ||
            (bp as any)?.location_verification_status ||
            ""
        );

        const paid = isPaidActive(plan, status);
        const verified = isVerifiedVendor(approval);

        if (!alive) return;

        setAccess({
          loading: false,
          allowed: paid && verified,
          reason:
            paid && verified
              ? ""
              : "Custom product variations are available for paid and verified vendors only.",
          businessName:
            String((bp as any)?.business_name || (bp as any)?.company_name || "") ||
            "Your Business",
          plan,
          status,
          approval,
        });
      } catch (e: any) {
        if (!alive) return;
        setAccess({
          loading: false,
          allowed: false,
          reason: e?.message || "Unable to check vendor access.",
          businessName: "",
          plan: "free",
          status: "free",
          approval: "",
        });
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <UniversalDashboardShell
      eyebrow="Vendor Product Setup"
      title="Add Your Product Variations"
      subtitle="Paid and verified vendors can add their own material and rental variations in simple business language."
    >
      {access.loading ? (
        <SimpleCard
          title="Checking your vendor access"
          subtitle="Please wait while we confirm your business profile."
        >
          <div style={{ color: "#64748b", fontWeight: 700 }}>Loading…</div>
        </SimpleCard>
      ) : !access.allowed ? (
        <SimpleCard
          title="Upgrade and verify to unlock this"
          subtitle="This protects marketplace quality and keeps product filters clean for buyers."
        >
          <div
            style={{
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#9a3412",
              borderRadius: 16,
              padding: 14,
              fontWeight: 800,
              lineHeight: 1.6,
            }}
          >
            {access.reason}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
            }}
          >
            <WorkButton
              href="/dashboard/subscription"
              title="Activate Vendor Plan"
              detail="Unlock premium vendor tools and visibility."
            />
            <WorkButton
              href="/onboarding/business"
              title="Verify Business Profile"
              detail="Complete business and location verification."
            />
            <WorkButton
              href="/dashboard/vendor"
              title="Back to Vendor Dashboard"
              detail="Continue normal vendor operations."
            />
          </div>
        </SimpleCard>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <SimpleCard
            title={`Welcome, ${access.businessName}`}
            subtitle="Add only the variations you actually sell or rent. These will be kept connected to your vendor profile."
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              <span style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534", borderRadius: 999, padding: "7px 10px" }}>
                Paid plan: {access.plan}
              </span>
              <span style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "7px 10px" }}>
                Status: {access.status}
              </span>
              <span style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", borderRadius: 999, padding: "7px 10px" }}>
                Verification: {access.approval || "verified"}
              </span>
            </div>
          </SimpleCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 16,
            }}
          >
            <SimpleCard
              title="Materials"
              subtitle="Add product variations, specifications, sizes, grades, brands and packing options for materials you sell."
            >
              <div style={{ display: "grid", gap: 10 }}>
                <WorkButton
                  href="/dashboard/vendor/master-data/materials"
                  title="Add Material Variation"
                  detail="Example: TMT Bar 12mm, PPC Cement 50kg, River Sand 250 cft truck."
                />
                <WorkButton
                  href="/materials/add"
                  title="Add Material Listing"
                  detail="Use your existing product listing form."
                />
              </div>
            </SimpleCard>

            <SimpleCard
              title="Rentals"
              subtitle="Add machine variations, capacity, rental unit, service area and operator options."
            >
              <div style={{ display: "grid", gap: 10 }}>
                <WorkButton
                  href="/dashboard/vendor/master-data/rentals"
                  title="Add Rental Variation"
                  detail="Example: JCB with operator, mixer machine daily rent, scaffolding per sq ft."
                />
                <WorkButton
                  href="/rentals/add"
                  title="Add Rental Listing"
                  detail="Use your existing rental listing form."
                />
              </div>
            </SimpleCard>
          </div>

          <SimpleCard
            title="How this works"
            subtitle="Simple rules to keep your products easy for buyers to find."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: 12,
              }}
            >
              {[
                ["Use buyer language", "Write names the way local buyers search."],
                ["Avoid duplicates", "Do not add the same size or option multiple times."],
                ["Keep it practical", "Only add variations you actually provide."],
                ["Admin can promote later", "Good repeated vendor options may become global marketplace options."],
              ].map(([title, detail]) => (
                <div
                  key={title}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 12,
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
                  <div style={{ marginTop: 5, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                    {detail}
                  </div>
                </div>
              ))}
            </div>
          </SimpleCard>
        </div>
      )}
    </UniversalDashboardShell>
  );
}

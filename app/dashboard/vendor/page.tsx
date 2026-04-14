"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { resolveAccessForUser, type VendorCapabilityKey } from "@/lib/access/resolveAccess";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { Grid } from "@/components/ui/Grid";
import { EmptyState } from "@/components/ui/EmptyState";

type CompletenessRow = {
  user_id?: string;
  business_profile_complete?: boolean;
  is_complete?: boolean;
  completion_percent?: number;
  percent?: number;
};

type EnquiryStatus = "new" | "contacted" | "closed" | "spam" | string;

type EnquiryRow = {
  id: string;
  buyer_user_id: string;
  vendor_user_id: string;
  subject_type: string;
  subject_id: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  message: string;
  status: EnquiryStatus;
  created_at: string;
};

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function clip(s: string, n = 90) {
  const t = (s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function titleCase(s: string) {
  const t = (s ?? "").replace(/_/g, " ").trim();
  return t.length ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "ok";
}) {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold border";
  const cls =
    tone === "warn"
      ? `${base} border-amber-200 bg-amber-50 text-amber-900`
      : tone === "ok"
      ? `${base} border-emerald-200 bg-emerald-50 text-emerald-900`
      : `${base} border-neutral-200 bg-neutral-50 text-neutral-800`;

  return <span className={cls}>{children}</span>;
}

function StatusPill({ status }: { status: EnquiryStatus }) {
  const s = (status ?? "new").toLowerCase();
  if (s === "new") return <Pill tone="warn">new</Pill>;
  if (s === "contacted") return <Pill>contacted</Pill>;
  if (s === "closed") return <Pill tone="ok">closed</Pill>;
  if (s === "spam") return <Pill>spam</Pill>;
  return <Pill>{s}</Pill>;
}

function capabilityLabel(cap: VendorCapabilityKey) {
  if (cap === "property_owner") return "Property Owner";
  if (cap === "property_builder") return "Property Builder";
  if (cap === "materials") return "Materials";
  if (cap === "services") return "Services";
  if (cap === "rentals") return "Rentals";
  if (cap === "blog_author") return "Blog Author";
  if (cap === "investor") return "Investor";
  return titleCase(String(cap));
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [email, setEmail] = useState<string | null>(null);

  const [isVendor, setIsVendor] = useState(false);
  const [vendorComplete, setVendorComplete] = useState<boolean | null>(null);
  const [vendorPct, setVendorPct] = useState<number | null>(null);

  const [vendorCapabilities, setVendorCapabilities] = useState<VendorCapabilityKey[]>([]);
    const uniqueVendorCapabilities = useMemo(
    () => Array.from(new Set(vendorCapabilities)),
    [vendorCapabilities]
  );
  const [vendorHasFullAccess, setVendorHasFullAccess] = useState(false);
    const dashboardTitle = vendorHasFullAccess
    ? "Vendor Hub Dashboard"
    : uniqueVendorCapabilities.includes("property_builder") &&
      uniqueVendorCapabilities.length === 1
    ? "Builder Dashboard"
    : uniqueVendorCapabilities.includes("investor") &&
      uniqueVendorCapabilities.length === 1
    ? "Investor Dashboard"
    : "Vendor Dashboard";

  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiriesErr, setEnquiriesErr] = useState<string | null>(null);
  const [recentEnquiries, setRecentEnquiries] = useState<EnquiryRow[]>([]);

  async function load() {
    setLoading(true);
    setErr(null);
    setEnquiriesErr(null);

    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      setErr(sErr.message);
      setVendorCapabilities([]);
      setVendorHasFullAccess(false);
      setLoading(false);
      return;
    }

    const session = s.session;
    if (!session) {
      router.replace("/login?next=/dashboard/vendor");
      return;
    }

    setEmail(session.user.email ?? null);

    const access = await resolveAccessForUser(
      supabase,
      session.user.id,
      session.user.email ?? null
    );

    const v = access.isVendor || access.isHubVendor;
    setIsVendor(v);
    setVendorCapabilities(access.vendorCapabilities);
    setVendorHasFullAccess(access.vendorHasFullAccess);

    if (!v) {
      setVendorComplete(null);
      setVendorPct(null);
      setVendorCapabilities([]);
      setVendorHasFullAccess(false);
      setRecentEnquiries([]);
      setLoading(false);
      return;
    }

    const { data: comp, error: compErr } = await supabase
      .from("v_vendor_profile_completeness")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!compErr && comp) {
      const row = comp as CompletenessRow;
      const pct = toNumber(row.completion_percent) ?? toNumber(row.percent) ?? null;
      const complete =
        row.business_profile_complete === true || row.is_complete === true;

      setVendorPct(pct);
      setVendorComplete(complete);
    } else {
      setVendorPct(null);
      setVendorComplete(null);
    }

    setEnquiriesLoading(true);
    setEnquiriesErr(null);

    const { data: enq, error: enqErr } = await supabase
      .from("enquiries")
      .select(
        "id,buyer_user_id,vendor_user_id,subject_type,subject_id,buyer_name,buyer_phone,buyer_email,message,status,created_at"
      )
      .eq("vendor_user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (enqErr) {
      setEnquiriesErr(enqErr.message);
      setRecentEnquiries([]);
    } else {
      setRecentEnquiries((enq ?? []) as EnquiryRow[]);
    }

    setEnquiriesLoading(false);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title={dashboardTitle} subtitle="Loading..." />
          <div style={{ opacity: 0.8 }}>Preparing your vendor workspace…</div>
        </Container>
      </main>
    );
  }

  if (err) {
    return (
      <main>
        <Container>
          <SectionHeader title={dashboardTitle} subtitle="" />
          <EmptyState message="Something went wrong while loading your vendor dashboard." />
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 800 }}>{err}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← Back to Dashboard
            </ActionButton>
            <button
              type="button"
              onClick={() => load()}
              style={{
                height: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </Container>
      </main>
    );
  }

  if (!isVendor) {
    return (
      <main>
        <Container>
          <SectionHeader title={dashboardTitle} subtitle="Vendor access required." />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <ActionButton href="/dashboard" variant="secondary">
              ← Back
            </ActionButton>
            <ActionButton href="/auth/register-role" variant="primary">
              Start Vendor Registration →
            </ActionButton>
          </div>

          <EmptyState message="You do not currently have vendor access. Start vendor registration to unlock your business dashboard." />

          <div style={{ marginTop: 12, color: "#5b6472", fontSize: 13 }}>
            Signed in as: <b>{email ?? "—"}</b>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader
          title={dashboardTitle}
          subtitle="Manage your listings, profile, and business actions from one place."
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <ActionButton href="/dashboard" variant="secondary">
            ← All Dashboards
          </ActionButton>

          <button
            type="button"
            onClick={() => load()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Badge>{email ?? "—"}</Badge>

            {vendorHasFullAccess ? (
              <Pill tone="ok">Full Hub Access</Pill>
            ) : uniqueVendorCapabilities.length > 0 ? (
              <Pill>
                {uniqueVendorCapabilities.length} Capability
                {uniqueVendorCapabilities.length > 1 ? "ies" : "y"}
              </Pill>
            ) : null}

            {vendorComplete === true ? (
              <Pill tone="ok">Registration Complete</Pill>
            ) : (
              <Pill tone="warn">Incomplete</Pill>
            )}

            {vendorPct !== null ? <Pill>{vendorPct}%</Pill> : null}
          </div>
        </div>

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
              Your Access
            </div>
            <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
              These are the business capabilities currently enabled for your vendor account.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {uniqueVendorCapabilities.length === 0 ? (
                <Pill tone="warn">No capabilities enabled</Pill>
              ) : (
                uniqueVendorCapabilities.map((cap) => (
                  <Pill key={cap} tone={vendorHasFullAccess ? "ok" : "neutral"}>
                    {capabilityLabel(cap)}
                  </Pill>
                ))
              )}

              {vendorHasFullAccess && uniqueVendorCapabilities.length === 7 ? (
                <Pill tone="ok">3Bigha Full Real Estate Hub</Pill>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <div style={{ height: 12 }} />

        {vendorComplete === false ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-extrabold text-amber-900">
              Complete your Business Profile to unlock publishing & full vendor features.
            </div>
            <div className="mt-1 text-sm text-amber-900/80">
              You can save drafts, but publishing and some actions remain gated until
              registration is complete.
            </div>
            <div className="mt-3 flex flex-wrap gap-10">
              <ActionButton href="/onboarding/business" variant="primary">
                Complete Business Profile →
              </ActionButton>
              <Link href="/property/my" className="font-extrabold underline">
                Continue managing listings
              </Link>
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <Card>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                    Recent Enquiries
                  </div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Latest buyer enquiries sent to your business. (Last 5)
                  </div>
                </div>

                {enquiriesLoading ? <Pill>Loading…</Pill> : <Pill>{recentEnquiries.length}</Pill>}
              </div>

              {enquiriesErr ? (
                <div style={{ marginTop: 10, color: "crimson", fontWeight: 800 }}>
                  {enquiriesErr}
                </div>
              ) : null}

              {!enquiriesLoading && !enquiriesErr && recentEnquiries.length === 0 ? (
                <div style={{ marginTop: 10, color: "#5b6472", fontSize: 13 }}>
                  No enquiries yet. Once buyers start contacting you, they will appear here.
                </div>
              ) : null}

              {!enquiriesLoading && recentEnquiries.length > 0 ? (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {recentEnquiries.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 14,
                        padding: 12,
                        background: "white",
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <Pill>{titleCase(e.subject_type)}</Pill>
                          <StatusPill status={e.status} />
                          <Pill>{fmtDateTime(e.created_at)}</Pill>
                        </div>

                        <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4 }}>
                          From: {e.buyer_name?.trim() ? e.buyer_name : "Buyer"}
                        </div>

                        <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                          {clip(e.message, 120)}
                        </div>

                        <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          {e.buyer_phone ? <Pill>{e.buyer_phone}</Pill> : null}
                          {e.buyer_email ? <Pill>{e.buyer_email}</Pill> : null}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                        <ActionButton href={`/dashboard/vendor/enquiries?focus=${encodeURIComponent(e.id)}`} variant="secondary">
                          View
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardBody>

            <CardFooter>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                <ActionButton href="/dashboard/vendor/enquiries" variant="primary">
                  Open Enquiries Inbox →
                </ActionButton>
                <span style={{ color: "#5b6472", fontSize: 13, alignSelf: "center" }}>
                  Manage status + reply threads from the inbox.
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>

        {uniqueVendorCapabilities.length === 0 ? (
          <div
            style={{
              marginBottom: 12,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#881337",
              borderRadius: 14,
              padding: 12,
              fontWeight: 700,
            }}
          >
            No vendor business capabilities are enabled for this account yet. Please contact admin or upgrade your subscription.
          </div>
        ) : null}

        <Card>
          <CardBody>
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Quick Actions</div>
            <div style={{ color: "#5b6472", fontSize: 13 }}>
              Jump into your most common tasks.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {uniqueVendorCapabilities.includes("property_owner") ? (
                <ActionButton href="/property/add" variant="primary">
                  Post Property
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("property_builder") ? (
                <ActionButton href="/property/builder/projects/add" variant="secondary">
                  Add Builder Project
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("materials") ? (
                <ActionButton href="/materials/add" variant="secondary">
                  Add Material
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("services") ? (
                <ActionButton href="/services/add" variant="secondary">
                  Add Service
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("rentals") ? (
                <ActionButton href="/rentals/add" variant="secondary">
                  Add Rental
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("blog_author") ? (
                <ActionButton href="/blog/new" variant="secondary">
                  Write Blog Post
                </ActionButton>
              ) : null}

              {uniqueVendorCapabilities.includes("investor") ? (
              <ActionButton href="/dashboard/investor" variant="secondary">
                Investment Dashboard
              </ActionButton>
            ) : null}

            <ActionButton href="/onboarding/business" variant="secondary">
              Business Profile
            </ActionButton>
            </div>
          </CardBody>
        </Card>

        <div style={{ marginTop: 12 }}>
          <Grid min={280} gap={12}>
            {uniqueVendorCapabilities.includes("property_owner") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Properties</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your property listings (draft/pending/approved/rejected) and edits.
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My listings</Pill>
                    <Pill>Statuses</Pill>
                    <Pill>Edits</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/property/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/property/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /property/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("property_builder") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Builder Projects</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage builder projects, units, inventory and related listing flows.
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>Projects</Pill>
                    <Pill>Units</Pill>
                    <Pill>Inventory</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/property/builder/projects" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/property/builder/projects" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /property/builder/projects
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("materials") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Materials</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your material listings and keep your catalog up to date.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My products</Pill>
                    <Pill>Drafts</Pill>
                    <Pill>Live</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/materials/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/materials/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /materials/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("services") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Services</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage service listings, pricing, and provider info.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My services</Pill>
                    <Pill>Pricing</Pill>
                    <Pill>Status</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/services/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/services/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /services/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("rentals") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Rentals</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage rental listings and availability.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My rentals</Pill>
                    <Pill>Rates</Pill>
                    <Pill>Status</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/rentals/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/rentals/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /rentals/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("blog_author") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Blog / News</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Write category-first posts. Drafts are always allowed; publish may be gated.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>My posts</Pill>
                    <Pill>Drafts</Pill>
                    {vendorComplete === false ? <Pill tone="warn">Publish locked</Pill> : <Pill tone="ok">Publish enabled</Pill>}
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/blog/my" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/blog/my" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /blog/my
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}

            {uniqueVendorCapabilities.includes("investor") ? (
              <Card>
                <CardBody>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Investment</div>
                  <div style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.5 }}>
                    Manage your investment opportunities, applications, and deal rooms.
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Pill>Opportunities</Pill>
                    <Pill>Applications</Pill>
                    <Pill>Deal Rooms</Pill>
                  </div>
                </CardBody>
                <CardFooter>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%" }}>
                    <ActionButton href="/dashboard/investor" variant="primary">
                      Open →
                    </ActionButton>
                    <Link href="/dashboard/investor" style={{ fontWeight: 800, alignSelf: "center" }}>
                      /dashboard/investor
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ) : null}
          </Grid>
        </div>

        <div style={{ marginTop: 16, opacity: 0.75, fontSize: 13 }}>
          Next after inbox: we can add notifications + buyer enquiry form from listing pages.
        </div>
      </Container>
    </main>
  );
}
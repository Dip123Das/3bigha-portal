"use client";

import React, { useEffect, useMemo, useState } from "react";
import TrustedListingMediaBadge from "@/components/trust/TrustedListingMediaBadge";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type TurnkeyPkgRow = {
  id?: string | null;

  provider_id?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
  provider_kind?: string | null;
  provider_phone?: string | null;
  provider_email?: string | null;
  provider_status?: string | null;

  // vendor package fields
  package_code?: string | null;
  package_name?: string | null;
  marketing_title?: string | null;

  rate_per_unit?: number | null;
  rate_unit?: string | null;
  currency?: string | null;

  coverage_area?: string | null;
  expected_start_time?: string | null;
  estimated_duration?: string | null;
  warranty?: string | null;

  gst_applicable?: boolean | null;
  gst_pct?: number | null;

  payment_terms?: any | null;

  short_highlights?: string[] | null;
  full_scope?: string | null;
  material_specification?: string | null;

  inclusions?: string | null;
  exclusions?: string | null;
  notes?: string | null;

  created_at?: string | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function fmtMoney(currency: string | null | undefined, amount: number | null | undefined) {
  if (amount == null) return null;
  const cur = (currency ?? "INR").toUpperCase();
  const symbol = cur === "INR" ? "₹" : cur + " ";
  return `${symbol}${amount}`;
}

function renderPaymentTerms(pt: any) {
  if (!pt) return null;
  try {
    const arr = Array.isArray(pt) ? pt : typeof pt === "string" ? JSON.parse(pt) : pt;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Payment milestones</div>
        <div style={{ display: "grid", gap: 8 }}>
          {arr.map((m: any, i: number) => (
            <div
              key={m?.key ?? i}
              style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#fff" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{m?.label ?? m?.stage ?? `Milestone ${i + 1}`}</div>
                <Badge>{typeof m?.pct === "number" ? `${m.pct}%` : "—"}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

export default function TurnkeyPackageDetailsPage({ params }: { params: { packageID: string } }) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const packageID = params?.packageID ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [row, setRow] = useState<TurnkeyPkgRow | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setRow(null);

      // Guard: wrong route like /services/providers will hit this file with packageID="providers"
      if (!packageID || (!isUuid(packageID) && packageID.length > 60)) {
        if (!alive) return;
        setErr(`Invalid package id in URL: "${packageID}".`);
        setLoading(false);
        return;
      }

      try {
        // We read from public view (recommended)
        // ✅ IMPORTANT: (supabase as any) avoids GenericStringError typing problem for views.
        let q = (supabase as any).from("v_turnkey_packages_public").select("*").limit(1);

        if (isUuid(packageID)) {
          q = q.eq("id", packageID);
        } else {
          // fallback: allow package_code-based routing if your UI uses A1/B2/etc in URL
          // (only works if view exposes package_code)
          q = q.eq("package_code", packageID);
        }

        const { data, error } = await q.maybeSingle();

        if (!alive) return;

        if (error) {
          setErr(error.message || "Failed to load turnkey package.");
          setLoading(false);
          return;
        }

        if (!data) {
          setErr("Package not found.");
          setLoading(false);
          return;
        }

        setRow(data as TurnkeyPkgRow);
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load package.");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [packageID, supabase]);

  return (
    <main>
      <Container>
        <SectionHeader
          title="Turnkey Package Details"
          subtitle="Full scope, material specification, pricing and terms for this turnkey package."
        />

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton href="/services/turnkey" variant="secondary">
            ← Back to Turnkey
          </ActionButton>
          <ActionButton href="/services" variant="secondary">
            Back to Services
          </ActionButton>
        </div>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <EmptyState message="Loading package…" />
          ) : err ? (
            <Card>
              <CardBody>
                <div style={{ color: "crimson", fontWeight: 900, marginBottom: 6 }}>{err}</div>
                <div style={{ color: "#5b6472", fontSize: 13 }}>
                  This usually happens when a link points to a non-package route (example: <code>/services/providers</code>)
                  but your app expects <code>/services/turnkey/[packageID]</code>.
                </div>
              </CardBody>
              <CardFooter>
                <ActionButton href="/services/turnkey" variant="primary">
                  Go to Turnkey →
                </ActionButton>
              </CardFooter>
            </Card>
          ) : !row ? (
            <EmptyState message="Package not found." />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <TrustedListingMediaBadge
                media={(row as any).media_assets}
                module="services"
              />

              <Card>
                <CardBody>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>
                      {(row.marketing_title?.trim() || row.package_name?.trim() || row.package_code || "Turnkey Package") as string}
                    </h2>
                    <div style={{ marginTop: 6, color: "#5b6472" }}>
                      Provider: <b>{row.provider_name ?? "—"}</b>{" "}
                      {row.provider_kind ? <span style={{ opacity: 0.85 }}>• {row.provider_kind}</span> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {row.package_code ? <Badge>{row.package_code}</Badge> : null}
                    {row.package_name ? <Badge>{row.package_name}</Badge> : null}
                    {row.rate_per_unit != null ? (
                      <Badge>
                        {fmtMoney(row.currency, row.rate_per_unit)}
                        {row.rate_unit ? ` / ${row.rate_unit}` : ""}
                      </Badge>
                    ) : (
                      <Badge>Price on request</Badge>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Coverage & Timeline</div>
                    <div style={{ color: "#5b6472" }}>
                      {row.coverage_area ? <div>Coverage: {row.coverage_area}</div> : null}
                      {row.expected_start_time ? <div>Start time: {row.expected_start_time}</div> : null}
                      {row.estimated_duration ? <div>Duration: {row.estimated_duration}</div> : null}
                      {row.warranty ? <div>Warranty: {row.warranty}</div> : null}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>GST</div>
                    <div style={{ color: "#5b6472" }}>
                      GST: <b>{row.gst_applicable ? "Applicable" : "Not applicable"}</b>
                      {row.gst_applicable && typeof row.gst_pct === "number" ? <span> • {row.gst_pct}%</span> : null}
                    </div>
                  </div>

                  {row.short_highlights?.length ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Highlights</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>
                        {row.short_highlights.map((h) => `• ${h}`).join("\n")}
                      </div>
                    </div>
                  ) : null}

                  {row.full_scope?.trim() ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Full scope</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>{row.full_scope}</div>
                    </div>
                  ) : null}

                  {row.material_specification?.trim() ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Material specification</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>{row.material_specification}</div>
                    </div>
                  ) : null}

                  {renderPaymentTerms(row.payment_terms)}

                  {row.inclusions?.trim() ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Inclusions</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>{row.inclusions}</div>
                    </div>
                  ) : null}

                  {row.exclusions?.trim() ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Exclusions</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>{row.exclusions}</div>
                    </div>
                  ) : null}

                  {row.notes?.trim() ? (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
                      <div style={{ color: "#5b6472", whiteSpace: "pre-wrap" }}>{row.notes}</div>
                    </div>
                  ) : null}
                </div>
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 10, flexWrap: "wrap" }}>
                  <ActionButton href="/services/turnkey" variant="secondary">
                    ← Back
                  </ActionButton>
                  <ActionButton
                    href={row.provider_slug ? `/services/providers/${row.provider_slug}` : "/services"}
                    variant="primary"
                  >
                    Contact / View provider →
                  </ActionButton>
                </div>
              </CardFooter>
            </Card>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}

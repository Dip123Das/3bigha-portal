// app/services/turnkey/add/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

import { Container } from "@/components/layout/Container";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardBody, CardFooter } from "@/components/ui/Card";
import { Grid } from "@/components/ui/Grid";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";
import {
  estimateConstructionCost,
  formatIndianCurrency,
} from "@/lib/construction-cost/cost-utils";
import type { ConstructionGrade } from "@/lib/construction-cost/cost-config";

type WizardStep = 1 | 2 | 3;

type ProviderRow = {
  id: string;
  status: string | null;
  provider_kind?: string | null;
  name?: string | null;
  slug?: string | null;
};

type TurnkeyTemplateRow = {
  // IMPORTANT: we alias DB column code -> template_code in select
  template_code: string;
  grade: string | null;
  subgrade: number | null;
  public_label: string | null;
  marketing_title: string | null;
  guidance_rate_per_sqft: number | null;

  short_highlights?: string[] | null;
  full_scope?: string | null;
  material_specification?: string | null;
  scope_of_work?: string | null;

  is_active?: boolean | null;
  sort_order?: number | null;
};

type PaymentStage = "booking" | "plinth" | "slab" | "finishing" | "handover" | "custom";

type PaymentMilestone = {
  key: string;
  stage: PaymentStage;
  label: string;
  pct: number | null;
};

type VendorTurnkeyDraft = {
  key: string;
  template_code: string;
  enabled: boolean;

  // pricing
  vendor_rate_per_sqft: number | null;
  currency: string; // "INR"

  // coverage / timeline
  coverage_area: string;
  expected_start_time: string; // e.g. "7 days"
  estimated_duration: string; // e.g. "6 months"

  // warranty / gst
  warranty: string;
  gst_applicable: boolean;
  gst_pct: number | null;

  // scope notes
  inclusions: string;
  exclusions: string;
  notes: string;

  // payments
  payment_milestones: PaymentMilestone[];
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function parseOptionalNumber(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const styles = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  field: { display: "block", width: "100%" },
  label: {
    fontSize: 12,
    color: "#5b6472",
    fontWeight: 700,
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: 14,
    background: "#fff",
    resize: "vertical" as const,
  },
  minor: { color: "#5b6472", fontSize: 12 },
  gateBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "#fff",
  },
  stepPill: (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 900,
    fontSize: 12,
  }),
  miniBtn: (active?: boolean): React.CSSProperties => ({
    border: active ? "2px solid #111827" : "1px solid #e5e7eb",
    background: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
  }),
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 12,
    background: "#fff",
  },
};

function defaultMilestones(): PaymentMilestone[] {
  return [
    { key: uid(), stage: "booking", label: "Booking / Agreement", pct: 10 },
    { key: uid(), stage: "plinth", label: "Plinth level", pct: 20 },
    { key: uid(), stage: "slab", label: "Roof slab / structure", pct: 30 },
    { key: uid(), stage: "finishing", label: "Finishing stage", pct: 30 },
    { key: uid(), stage: "handover", label: "Handover", pct: 10 },
  ];
}

type ScopeSection = {
  title: string;
  items: string[];
};

function getTurnkeyGradeText(t?: TurnkeyTemplateRow | null) {
  const grade = String(t?.grade || t?.template_code || "").toUpperCase();
  const subgrade = String(t?.public_label || "").toLowerCase();

  if (subgrade.includes("premium") || grade.includes("PREMIUM") || String(t?.template_code || "").endsWith("3")) {
    return "premium";
  }

  if (subgrade.includes("standard") || grade.includes("STANDARD") || String(t?.template_code || "").endsWith("2")) {
    return "standard";
  }

  return "economy";
}

function getDefaultTurnkeyScope(t?: TurnkeyTemplateRow | null): ScopeSection[] {
  const grade = getTurnkeyGradeText(t);

  const tmt =
    grade === "premium"
      ? "Reputed branded TMT Fe500D/Fe550D as per structural design and market availability."
      : grade === "standard"
      ? "Branded TMT Fe500/Fe500D as per structural design."
      : "ISI/local non-branded TMT Fe500 subject to buyer approval and structural requirement.";

  const cement =
    grade === "premium"
      ? "Premium OPC 53 / PPC cement from reputed brands as per work stage requirement."
      : grade === "standard"
      ? "Branded OPC 43/53 or PPC cement as per work requirement."
      : "Standard OPC/PPC cement, normally 43 grade or equivalent, subject to availability.";

  const brick =
    grade === "premium"
      ? "Premium first-class brick / AAC block / fly-ash block as mutually finalized."
      : grade === "standard"
      ? "First-class machine-made brick / good quality fly-ash brick / AAC block as finalized."
      : "Standard first-class brick or locally available good quality brick.";

  return [
    {
      title: "Structural & RCC Work",
      items: [
        "Foundation, column, beam, lintel, roof slab and staircase RCC as per approved structural design.",
        tmt,
        cement,
        "Stone chips, sand and shuttering quality to be suitable for residential construction.",
      ],
    },
    {
      title: "Brick / Block Masonry",
      items: [
        brick,
        "External and internal wall thickness as per drawing and package specification.",
        "Mortar mix to follow practical site requirement and engineering guidance.",
      ],
    },
    {
      title: "Plastering & Finishing Base",
      items: [
        "Internal and external plaster with proper line, level and curing.",
        "Wall putty / primer / finishing layer depends on package grade and final inclusion.",
      ],
    },
    {
      title: "Flooring",
      items: [
        grade === "premium"
          ? "Premium vitrified tiles / equivalent flooring range as finalized."
          : grade === "standard"
          ? "Standard vitrified tiles / ceramic tiles within agreed range."
          : "Basic ceramic / vitrified flooring within economy range.",
        "Skirting and bathroom floor/wall tiles as per agreed package.",
      ],
    },
    {
      title: "Electrical Work",
      items: [
        grade === "premium"
          ? "Concealed wiring with reputed branded wires, modular switches and DB protection."
          : grade === "standard"
          ? "Concealed wiring with branded wires and standard modular switches."
          : "Basic concealed wiring with standard quality wires and switches.",
        "Point quantity, inverter/AC/geyser points and earthing must be clarified before rate finalization.",
      ],
    },
    {
      title: "Plumbing & Sanitary",
      items: [
        grade === "premium"
          ? "Branded CPVC/UPVC plumbing lines with premium sanitary fittings as finalized."
          : grade === "standard"
          ? "Branded/standard CPVC/UPVC plumbing lines and sanitary fittings."
          : "Standard plumbing lines and basic sanitary fittings.",
        "Water tank, pump, septic tank, soak pit and drainage scope must be clearly confirmed.",
      ],
    },
    {
      title: "Doors, Windows & Grill",
      items: [
        grade === "premium"
          ? "Premium flush doors / laminated doors / aluminium or UPVC windows as per package."
          : grade === "standard"
          ? "Standard flush doors and aluminium/steel windows as per package."
          : "Basic flush doors and standard windows as agreed.",
        "Main gate, boundary, safety grill and extra fabrication are included only if specifically written.",
      ],
    },
    {
      title: "Painting & Waterproofing",
      items: [
        grade === "premium"
          ? "Premium interior/exterior paint system with primer and putty as applicable."
          : grade === "standard"
          ? "Standard interior/exterior paint with primer."
          : "Basic paint finish as per economy package.",
        "Roof waterproofing, toilet waterproofing and damp treatment must be separately mentioned if included.",
      ],
    },
    {
      title: "Common Exclusions Unless Written",
      items: [
        "Land cost, mutation, conversion, plan sanction fees, architect/engineer fees and government charges.",
        "Deep piling, soil testing, boundary wall, gate, extra height, premium elevation, modular kitchen and furniture.",
        "Electrical meter, transformer, water connection, borewell, pump, septic tank, soak pit or drainage unless included.",
        "Rate may change due to soil condition, road access, material price rise, floor height, design change or remote site logistics.",
      ],
    },
  ];
}

function getTemplateScopeText(t?: TurnkeyTemplateRow | null) {
  return [t?.scope_of_work, t?.full_scope, t?.material_specification]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function makeDraftFromTemplate(t: TurnkeyTemplateRow): VendorTurnkeyDraft {
  return {
    key: uid(),
    template_code: t.template_code,
    enabled: (t.public_label ?? "").toLowerCase() !== "luxury",
    vendor_rate_per_sqft: typeof t.guidance_rate_per_sqft === "number" ? Math.round(t.guidance_rate_per_sqft) : null,
    currency: "INR",

    coverage_area: "Cooch Behar / Nearby",
    expected_start_time: "7 days",
    estimated_duration: "6 months",

    warranty: "6 months workmanship warranty",
    gst_applicable: false,
    gst_pct: null,

    inclusions: "",
    exclusions: "",
    notes: "",

    payment_milestones: defaultMilestones(),
  };
}

export default function AddTurnkeyPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [provider, setProvider] = useState<ProviderRow | null>(null);
  const [templates, setTemplates] = useState<TurnkeyTemplateRow[]>([]);
  const [drafts, setDrafts] = useState<VendorTurnkeyDraft[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");
  const [openScopeCode, setOpenScopeCode] = useState<string>("");

  async function ensureProviderId(): Promise<string | null> {
    const { data: pid, error } = await supabase.rpc("upsert_service_provider_for_me");
    if (error) {
      setErr(error.message);
      return null;
    }
    return (pid ?? null) as string | null;
  }

  async function loadProviderById(providerId: string) {
    const { data, error } = await supabase
      .from("service_providers")
      .select("id,status,provider_kind,name,slug")
      .eq("id", providerId)
      .maybeSingle();
    if (error) return { id: providerId, status: null } as ProviderRow;
    return (data ?? { id: providerId, status: null }) as ProviderRow;
  }

  async function loadTemplates() {
    // IMPORTANT FIX: turnkey_package_templates uses column `code`, not `template_code`
    // We alias: template_code:code
    const { data, error } = await supabase
      .from("turnkey_package_templates")
      .select(
        [
          "template_code:code",
          "grade",
          "subgrade",
          "public_label",
          "marketing_title",
          "guidance_rate_per_sqft",
          "short_highlights",
          "full_scope",
          "material_specification",
          "scope_of_work",
          "is_active",
          "sort_order",
        ].join(",")
      )
      .order("sort_order", { ascending: true })
      .order("grade", { ascending: true })
      .order("subgrade", { ascending: true });

    if (error) {
      setTemplates([]);
      setDrafts([]);
      setErr(error.message);
      return;
    }

    const rows = ((data ?? []) as unknown) as TurnkeyTemplateRow[];

// keep only active templates (is_active true or null)
const activeRows = rows.filter((r) => r && r.is_active !== false && !!r.template_code);

setTemplates(activeRows);

const ds = activeRows.map((t) => makeDraftFromTemplate(t));
setDrafts(ds);
setActiveKey(ds[0]?.key ?? "");

  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace(`/login?next=${encodeURIComponent("/services/turnkey/add")}`);
        return;
      }

      const pid = await ensureProviderId();
      if (cancelled) return;

      if (!pid) {
        setProvider(null);
        await loadTemplates();
        if (!cancelled) setLoading(false);
        return;
      }

      const p = await loadProviderById(pid);
      if (cancelled) return;
      setProvider(p);

      await loadTemplates();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [turnkeyPreviewAreaSqFt, setTurnkeyPreviewAreaSqFt] = useState(1000);
  const [turnkeyPreviewFloorCount, setTurnkeyPreviewFloorCount] = useState(1);
  const [turnkeyPreviewGrade, setTurnkeyPreviewGrade] =
    useState<ConstructionGrade>("standard");

  const activeDraft = useMemo(() => drafts.find((d) => d.key === activeKey) ?? drafts[0] ?? null, [drafts, activeKey]);

  const turnkeyCostPreview = useMemo(
    () =>
      estimateConstructionCost({
        builtUpAreaSqFt: turnkeyPreviewAreaSqFt,
        floorCount: turnkeyPreviewFloorCount,
        grade: turnkeyPreviewGrade,
        region: "cooch_behar",
        customRatePerSqFt:
          typeof activeDraft?.vendor_rate_per_sqft === "number"
            ? activeDraft.vendor_rate_per_sqft
            : undefined,
      }),
    [
      activeDraft?.vendor_rate_per_sqft,
      turnkeyPreviewAreaSqFt,
      turnkeyPreviewFloorCount,
      turnkeyPreviewGrade,
    ],
  );

  function setDraft(key: string, patch: Partial<VendorTurnkeyDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function enabledCount() {
    return drafts.filter((d) => d.enabled).length;
  }

  function pctSum(ms: PaymentMilestone[]) {
    return ms.reduce((acc, x) => acc + (typeof x.pct === "number" ? x.pct : 0), 0);
  }

  function goToStep(next: WizardStep) {
    // soft guard
    if (next === 2 || next === 3) {
      if (enabledCount() === 0) {
        setStep(1);
        return;
      }
    }
    setStep(next);
  }

  async function saveAll(record_status: "draft" | "published") {
    setErr(null);

    const providerId = provider?.id ?? (await ensureProviderId());
    if (!providerId) {
      router.push(`/onboarding/business?returnTo=${encodeURIComponent("/services/turnkey/add")}`);
      return;
    }

    const enabled = drafts.filter((d) => d.enabled && !!d.template_code);
    if (enabled.length === 0) {
      alert("Please enable at least one turnkey package.");
      return;
    }

    // validate payment milestone pct total = 100 (soft)
    for (const d of enabled) {
      const s = pctSum(d.payment_milestones);
      if (s !== 100) {
        alert(`Payment milestone % total must be 100 for ${d.template_code}. Current total = ${s}.`);
        return;
      }
      if (d.gst_applicable && (typeof d.gst_pct !== "number" || d.gst_pct < 0)) {
        alert(`GST% required for ${d.template_code} if GST is applicable.`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const d of enabled) {
        const payload: any = {
          provider_id: providerId,
          template_code: d.template_code, // NOTE: your provider_turnkey_packages must have template_code OR we will remap later
          record_status,

          is_active: true,
          currency: d.currency || "INR",
          rate_unit: "per_sqft",
          rate_per_unit: typeof d.vendor_rate_per_sqft === "number" ? d.vendor_rate_per_sqft : null,

          coverage_area: d.coverage_area?.trim() ? d.coverage_area.trim() : null,
          expected_start_time: d.expected_start_time?.trim() ? d.expected_start_time.trim() : null,
          estimated_duration: d.estimated_duration?.trim() ? d.estimated_duration.trim() : null,
          warranty: d.warranty?.trim() ? d.warranty.trim() : null,

          gst_applicable: !!d.gst_applicable,
          gst_pct: d.gst_applicable ? d.gst_pct : null,

          payment_terms: d.payment_milestones?.length ? d.payment_milestones : null,

          inclusions: d.inclusions?.trim() ? d.inclusions.trim() : null,
          exclusions: d.exclusions?.trim() ? d.exclusions.trim() : null,
          notes: d.notes?.trim() ? d.notes.trim() : null,
        };

        const { error } = await supabase
          .from("provider_turnkey_packages")
          .upsert(payload, { onConflict: "provider_id,template_code" });

        if (error) {
          setErr(error.message);
          throw error;
        }
      }

      alert(record_status === "published" ? "Turnkey packages published!" : "Turnkey packages saved as draft!");
      router.push("/services/my");
    } catch (e: any) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main>
        <Container>
          <SectionHeader title="Turnkey House Construction" subtitle="Loading..." />
        </Container>
        <style jsx global>{`
          header,
          footer {
            display: none !important;
          }
          body {
            background: #f8fafc;
          }
        `}</style>
      </main>
    );
  }

  if (!provider?.id) {
    return (
      <main>
        <Container>
          <SectionHeader title="Turnkey House Construction" subtitle="Please complete your provider profile first." />

          <div style={{ marginTop: 14 }}>
            <div style={styles.gateBox}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Provider profile required</div>
              <div style={{ color: "#5b6472", fontSize: 13, marginBottom: 10 }}>
                To list turnkey packages, you must have a Service Provider profile linked to your account.
              </div>

              {err ? (
                <div style={{ color: "crimson", fontWeight: 900, fontSize: 13, marginBottom: 10 }}>Error: {err}</div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <ActionButton
                  href={`/onboarding/business?returnTo=${encodeURIComponent("/services/turnkey/add")}`}
                  variant="primary"
                >
                  Complete Provider Profile →
                </ActionButton>
              </div>
            </div>
          </div>
        </Container>

        <style jsx global>{`
          header,
          footer {
            display: none !important;
          }
          body {
            background: #f8fafc;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main>
      <Container>
        <SectionHeader title="Turnkey House Construction" subtitle="Wizard: select packages → fill pricing & terms → review & publish." />

        {err ? <div style={{ marginBottom: 12, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

        <Card>
          <CardBody>
            <div style={styles.toolbar}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Your Provider Account</div>
                <div style={{ color: "#5b6472", fontSize: 13 }}>
                  Provider status: <b>{provider.status ?? "—"}</b>{" "}
                  {provider.status?.toLowerCase() !== "published" ? (
                    <span style={{ marginLeft: 8 }}>
                      (Public visibility requires <b>published</b>)
                    </span>
                  ) : null}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span style={styles.stepPill(step === 1)}>1) Select</span>
                <span style={styles.stepPill(step === 2)}>2) Details</span>
                <span style={styles.stepPill(step === 3)}>3) Review & Save</span>

                <ActionButton href="/services/my" variant="secondary">
                  Go to My Services →
                </ActionButton>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* STEP 1 */}
        {step === 1 ? (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Step 1: Select Turnkey Packages</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Enable the packages you want to offer. Then go to Step 2 to set pricing and terms.
                    </div>
                  </div>

                  <button
                    onClick={() => goToStep(2)}
                    style={{ ...styles.miniBtn(), border: "1px solid #111827", fontWeight: 900 }}
                  >
                    Next → Step 2
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div style={{ marginTop: 12 }}>
                    <EmptyState message="No turnkey templates found yet." />
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <Grid min={280} gap={12}>
                      {templates.map((t) => {
                        const d = drafts.find((x) => x.template_code === t.template_code);
                        const enabled = !!d?.enabled;
                        const guidance = typeof t.guidance_rate_per_sqft === "number" ? `₹${t.guidance_rate_per_sqft}/sqft` : "—";

                        const title = (t.marketing_title ?? "").trim() || (t.public_label ?? "").trim() || "Template";
                        const label = `${t.template_code} • ${t.public_label ?? ""}`.trim();

                        return (
                          <Card key={t.template_code}>
                            <CardBody>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <div style={{ fontWeight: 900 }}>
                                  {title}
                                  <div style={{ color: "#5b6472", fontSize: 12, fontWeight: 700 }}>Admin guidance: {guidance}</div>
                                </div>
                                <Badge>{label}</Badge>
                              </div>

                              <div style={{ marginTop: 10 }}>
                                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) =>
                                      setDrafts((prev) =>
                                        prev.map((x) =>
                                          x.template_code === t.template_code ? { ...x, enabled: e.target.checked } : x
                                        )
                                      )
                                    }
                                  />
                                  Enable this package
                                </label>
                              </div>

                              {t.short_highlights?.length ? (
                                <div style={{ marginTop: 10, ...styles.box }}>
                                  <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Highlights</div>
                                  <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>
                                    {t.short_highlights.map((h, i) => `• ${h}`).join("\n")}
                                  </div>
                                </div>
                              ) : null}

                              <div style={{ marginTop: 10 }}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenScopeCode((prev) => (prev === t.template_code ? "" : t.template_code))
                                  }
                                  style={{
                                    ...styles.miniBtn(openScopeCode === t.template_code),
                                    width: "100%",
                                    textAlign: "left",
                                    background: openScopeCode === t.template_code ? "#eff6ff" : "#fff",
                                  }}
                                >
                                  {openScopeCode === t.template_code ? "Hide Scope of Work ↑" : "View Scope of Work ↓"}
                                </button>
                              </div>

                              {openScopeCode === t.template_code ? (
                                <div
                                  style={{
                                    marginTop: 10,
                                    border: "1px solid #bfdbfe",
                                    background: "#eff6ff",
                                    borderRadius: 14,
                                    padding: 12,
                                  }}
                                >
                                  <div style={{ fontWeight: 950, color: "#1e3a8a", marginBottom: 8 }}>
                                    Detailed Scope for Rate Calculation
                                  </div>

                                  {getTemplateScopeText(t) ? (
                                    <div
                                      style={{
                                        whiteSpace: "pre-wrap",
                                        fontSize: 12,
                                        lineHeight: 1.55,
                                        color: "#1f2937",
                                        marginBottom: 10,
                                      }}
                                    >
                                      {getTemplateScopeText(t)}
                                    </div>
                                  ) : null}

                                  <div style={{ display: "grid", gap: 8 }}>
                                    {getDefaultTurnkeyScope(t).map((section) => (
                                      <div
                                        key={section.title}
                                        style={{
                                          border: "1px solid #dbeafe",
                                          background: "#fff",
                                          borderRadius: 12,
                                          padding: 10,
                                        }}
                                      >
                                        <div style={{ fontWeight: 950, color: "#0f172a", fontSize: 13 }}>
                                          {section.title}
                                        </div>
                                        <div
                                          style={{
                                            marginTop: 5,
                                            whiteSpace: "pre-wrap",
                                            color: "#475569",
                                            fontSize: 12,
                                            lineHeight: 1.55,
                                          }}
                                        >
                                          {section.items.map((x) => `• ${x}`).join("\n")}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {t.full_scope || t.material_specification || t.scope_of_work ? (
                                <div style={{ marginTop: 10, ...styles.box }}>
                                  <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Template details</div>
                                  {t.scope_of_work ? (
                                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                                      <b>Scope of work:</b>{"\n"}
                                      {t.scope_of_work}
                                    </div>
                                  ) : null}
                                  {t.full_scope ? (
                                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                                      <b>Full scope:</b>{"\n"}
                                      {t.full_scope}
                                    </div>
                                  ) : null}
                                  {t.material_specification ? (
                                    <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>
                                      <b>Material spec:</b>{"\n"}
                                      {t.material_specification}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </CardBody>
                          </Card>
                        );
                      })}
                    </Grid>
                  </div>
                )}
              </CardBody>

              <CardFooter>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ color: "#5b6472", fontSize: 13 }}>
                    Enabled: <b>{enabledCount()}</b> package(s)
                  </div>

                  <button
                    onClick={() => goToStep(2)}
                    style={{
                      border: "1px solid #111827",
                      background: "#111827",
                      color: "#fff",
                      padding: "10px 12px",
                      borderRadius: 12,
                      cursor: enabledCount() ? "pointer" : "not-allowed",
                      fontWeight: 900,
                      opacity: enabledCount() ? 1 : 0.6,
                    }}
                    disabled={!enabledCount()}
                  >
                    Next → Step 2
                  </button>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Step 2: Pricing & Terms</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Choose an enabled package and fill your details. (Selection is done in Step 1.)
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        border: "1px solid rgba(22,163,74,0.24)",
                        background: "linear-gradient(135deg, rgba(22,163,74,0.08), #ffffff)",
                        borderRadius: 16,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontWeight: 950, color: "#166534", fontSize: 16 }}>
                        🏗 AI Turnkey Cost Preview
                      </div>

                      <div style={{ marginTop: 4, color: "#475569", fontSize: 12, fontWeight: 700 }}>
                        Helps contractor understand approximate project value before entering per sq.ft rate.
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <label>
                          <div style={styles.label}>Built-up area sq.ft</div>
                          <input
                            type="number"
                            value={turnkeyPreviewAreaSqFt}
                            onChange={(e) => setTurnkeyPreviewAreaSqFt(Number(e.target.value || 1000))}
                            style={styles.input}
                          />
                        </label>

                        <label>
                          <div style={styles.label}>Floors</div>
                          <select
                            value={turnkeyPreviewFloorCount}
                            onChange={(e) => setTurnkeyPreviewFloorCount(Number(e.target.value))}
                            style={styles.input}
                          >
                            {[1, 2, 3, 4, 5].map((floor) => (
                              <option key={floor} value={floor}>
                                {floor} Floor{floor > 1 ? "s" : ""}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <div style={styles.label}>Grade</div>
                          <select
                            value={turnkeyPreviewGrade}
                            onChange={(e) => setTurnkeyPreviewGrade(e.target.value as ConstructionGrade)}
                            style={styles.input}
                          >
                            <option value="economy">Economy</option>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                          </select>
                        </label>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        <div style={{ border: "1px solid #bbf7d0", background: "#f0fdf4", borderRadius: 12, padding: 10 }}>
                          <div style={{ fontSize: 12, color: "#166534", fontWeight: 900 }}>
                            Estimated Total
                          </div>
                          <div style={{ marginTop: 4, color: "#14532d", fontWeight: 1000, fontSize: 18 }}>
                            {formatIndianCurrency(turnkeyCostPreview.estimatedTotal)}
                          </div>
                        </div>

                        <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 12, padding: 10 }}>
                          <div style={{ fontSize: 12, color: "#1e40af", fontWeight: 900 }}>
                            Current Rate / Sq.ft
                          </div>
                          <div style={{ marginTop: 4, color: "#1e3a8a", fontWeight: 1000, fontSize: 18 }}>
                            {formatIndianCurrency(turnkeyCostPreview.ratePerSqFt)}
                          </div>
                        </div>

                        <div style={{ border: "1px solid #fde68a", background: "#fffbeb", borderRadius: 12, padding: 10 }}>
                          <div style={{ fontSize: 12, color: "#92400e", fontWeight: 900 }}>
                            Market Range
                          </div>
                          <div style={{ marginTop: 4, color: "#78350f", fontWeight: 1000, fontSize: 13 }}>
                            {formatIndianCurrency(turnkeyCostPreview.estimatedMinTotal)} -{" "}
                            {formatIndianCurrency(turnkeyCostPreview.estimatedMaxTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => setStep(1)} style={styles.miniBtn()}>
                      ← Back to Step 1
                    </button>
                    <button
                      onClick={() => goToStep(3)}
                      style={{
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: enabledCount() ? "pointer" : "not-allowed",
                        fontWeight: 900,
                        opacity: enabledCount() ? 1 : 0.6,
                      }}
                      disabled={!enabledCount()}
                    >
                      Next → Step 3
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Grid min={260} gap={10}>
                    {drafts.map((d) => {
                      const t = templates.find((x) => x.template_code === d.template_code);
                      const title = (t?.marketing_title ?? "").trim() || (t?.public_label ?? "").trim() || d.template_code;
                      const active = d.key === activeKey;

                      return (
                        <Card key={d.key}>
                          <CardBody>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 900 }}>
                                {title}
                                <div style={{ ...styles.minor, marginTop: 2 }}>{d.template_code}</div>
                              </div>

                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                {d.enabled ? <Badge>Enabled</Badge> : <Badge>Disabled</Badge>}
                                <button onClick={() => setActiveKey(d.key)} style={styles.miniBtn(active)}>
                                  {active ? "Editing" : "Edit"}
                                </button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </Grid>
                </div>

                {activeDraft ? (
                  <div style={{ marginTop: 12 }}>
                    <Card>
                      <CardBody>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 15 }}>
                              Editing:{" "}
                              {(templates.find((x) => x.template_code === activeDraft.template_code)?.marketing_title ?? "").trim() ||
                                activeDraft.template_code}
                            </div>
                            <div style={{ ...styles.minor, marginTop: 4 }}>Only enabled packages will be saved/published.</div>
                          </div>

                          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                            <input
                              type="checkbox"
                              checked={activeDraft.enabled}
                              onChange={(e) => setDraft(activeDraft.key, { enabled: e.target.checked })}
                            />
                            Enabled
                          </label>
                        </div>

                        {(() => {
                          const activeTemplate = templates.find((x) => x.template_code === activeDraft.template_code);
                          return (
                            <div
                              style={{
                                marginTop: 12,
                                border: "1px solid #fed7aa",
                                background: "#fff7ed",
                                borderRadius: 16,
                                padding: 12,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 950, color: "#9a3412" }}>
                                    Scope of Work before quoting per sqft
                                  </div>
                                  <div style={{ marginTop: 4, fontSize: 12, color: "#7c2d12", lineHeight: 1.5 }}>
                                    Contractor should check material grade, TMT, cement, brick/block, electrical,
                                    plumbing and exclusions before entering rate.
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenScopeCode((prev) =>
                                      prev === activeDraft.template_code ? "" : activeDraft.template_code
                                    )
                                  }
                                  style={{
                                    ...styles.miniBtn(openScopeCode === activeDraft.template_code),
                                    background: "#fff",
                                  }}
                                >
                                  {openScopeCode === activeDraft.template_code ? "Hide Scope" : "View Scope of Work"}
                                </button>
                              </div>

                              {openScopeCode === activeDraft.template_code ? (
                                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                                  {getTemplateScopeText(activeTemplate) ? (
                                    <div
                                      style={{
                                        border: "1px solid #fed7aa",
                                        background: "#fff",
                                        borderRadius: 12,
                                        padding: 10,
                                        whiteSpace: "pre-wrap",
                                        color: "#334155",
                                        fontSize: 12,
                                        lineHeight: 1.55,
                                      }}
                                    >
                                      {getTemplateScopeText(activeTemplate)}
                                    </div>
                                  ) : null}

                                  {getDefaultTurnkeyScope(activeTemplate).map((section) => (
                                    <div
                                      key={section.title}
                                      style={{
                                        border: "1px solid #fed7aa",
                                        background: "#fff",
                                        borderRadius: 12,
                                        padding: 10,
                                      }}
                                    >
                                      <div style={{ fontWeight: 950, color: "#0f172a", fontSize: 13 }}>
                                        {section.title}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 5,
                                          whiteSpace: "pre-wrap",
                                          color: "#475569",
                                          fontSize: 12,
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        {section.items.map((x) => `• ${x}`).join("\n")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}

                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Pricing</div>
                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Your rate per sqft (₹)</span>
                              <input
                                type="number"
                                value={typeof activeDraft.vendor_rate_per_sqft === "number" ? activeDraft.vendor_rate_per_sqft : ""}
                                onChange={(e) => setDraft(activeDraft.key, { vendor_rate_per_sqft: parseOptionalNumber(e.target.value) })}
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Currency</span>
                              <select
                                value={activeDraft.currency}
                                onChange={(e) => setDraft(activeDraft.key, { currency: e.target.value })}
                                style={styles.input}
                              >
                                <option value="INR">INR</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Coverage & Timeline</div>
                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Coverage area</span>
                              <input
                                value={activeDraft.coverage_area}
                                onChange={(e) => setDraft(activeDraft.key, { coverage_area: e.target.value })}
                                placeholder="e.g. Cooch Behar, Tufanganj, Alipurduar"
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Expected start time after order</span>
                              <input
                                value={activeDraft.expected_start_time}
                                onChange={(e) => setDraft(activeDraft.key, { expected_start_time: e.target.value })}
                                placeholder='e.g. "7 days"'
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Estimated duration</span>
                              <input
                                value={activeDraft.estimated_duration}
                                onChange={(e) => setDraft(activeDraft.key, { estimated_duration: e.target.value })}
                                placeholder='e.g. "6 months"'
                                style={styles.input}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Warranty & GST</div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Warranty / Quality assurance</span>
                              <input
                                value={activeDraft.warranty}
                                onChange={(e) => setDraft(activeDraft.key, { warranty: e.target.value })}
                                style={styles.input}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>GST applicable?</span>
                              <select
                                value={activeDraft.gst_applicable ? "yes" : "no"}
                                onChange={(e) =>
                                  setDraft(activeDraft.key, {
                                    gst_applicable: e.target.value === "yes",
                                    gst_pct: e.target.value === "yes" ? activeDraft.gst_pct : null,
                                  })
                                }
                                style={styles.input}
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </select>
                            </div>

                            {activeDraft.gst_applicable ? (
                              <div style={styles.field}>
                                <span style={styles.label}>GST %</span>
                                <input
                                  type="number"
                                  value={typeof activeDraft.gst_pct === "number" ? activeDraft.gst_pct : ""}
                                  onChange={(e) => setDraft(activeDraft.key, { gst_pct: parseOptionalNumber(e.target.value) })}
                                  style={styles.input}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Payment milestones (must total 100%)</div>

                          <div style={{ ...styles.minor, marginBottom: 8 }}>
                            Current total: <b>{pctSum(activeDraft.payment_milestones)}%</b>
                          </div>

                          <Grid min={260} gap={10}>
                            {activeDraft.payment_milestones.map((m) => (
                              <div
                                key={m.key}
                                style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 10, background: "#fff" }}
                              >
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  <div style={{ flex: 1, minWidth: 180 }}>
                                    <span style={styles.label}>Stage</span>
                                    <select
                                      value={m.stage}
                                      onChange={(e) => {
                                        const stage = e.target.value as PaymentStage;
                                        setDraft(activeDraft.key, {
                                          payment_milestones: activeDraft.payment_milestones.map((x) =>
                                            x.key === m.key ? { ...x, stage } :
                                                                                      x
                                          ),
                                        });
                                      }}
                                      style={styles.input}
                                    >
                                      <option value="booking">Booking</option>
                                      <option value="plinth">Plinth</option>
                                      <option value="slab">Slab/Structure</option>
                                      <option value="finishing">Finishing</option>
                                      <option value="handover">Handover</option>
                                      <option value="custom">Custom</option>
                                    </select>
                                  </div>

                                  <div style={{ flex: 2, minWidth: 220 }}>
                                    <span style={styles.label}>Label</span>
                                    <input
                                      value={m.label}
                                      onChange={(e) => {
                                        const label = e.target.value;
                                        setDraft(activeDraft.key, {
                                          payment_milestones: activeDraft.payment_milestones.map((x) =>
                                            x.key === m.key ? { ...x, label } : x
                                          ),
                                        });
                                      }}
                                      style={styles.input}
                                    />
                                  </div>

                                  <div style={{ width: 120 }}>
                                    <span style={styles.label}>%</span>
                                    <input
                                      type="number"
                                      value={typeof m.pct === "number" ? m.pct : ""}
                                      onChange={(e) => {
                                        const pct = parseOptionalNumber(e.target.value);
                                        setDraft(activeDraft.key, {
                                          payment_milestones: activeDraft.payment_milestones.map((x) =>
                                            x.key === m.key ? { ...x, pct } : x
                                          ),
                                        });
                                      }}
                                      style={styles.input}
                                    />
                                  </div>

                                  <div style={{ display: "flex", alignItems: "end" }}>
                                    <button
                                      onClick={() => {
                                        setDraft(activeDraft.key, {
                                          payment_milestones: activeDraft.payment_milestones.filter((x) => x.key !== m.key),
                                        });
                                      }}
                                      style={{ ...styles.miniBtn(), border: "1px solid #ef4444" }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </Grid>

                          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              onClick={() => {
                                setDraft(activeDraft.key, {
                                  payment_milestones: [
                                    ...activeDraft.payment_milestones,
                                    { key: uid(), stage: "custom", label: "Custom milestone", pct: null },
                                  ],
                                });
                              }}
                              style={styles.miniBtn()}
                            >
                              + Add milestone
                            </button>

                            <button
                              onClick={() => setDraft(activeDraft.key, { payment_milestones: defaultMilestones() })}
                              style={styles.miniBtn()}
                            >
                              Reset to default
                            </button>
                          </div>
                        </div>

                        <div style={{ marginTop: 12, ...styles.box }}>
                          <div style={{ fontWeight: 900, marginBottom: 8 }}>Inclusions / Exclusions / Notes</div>

                          <div style={styles.formGrid}>
                            <div style={styles.field}>
                              <span style={styles.label}>Inclusions</span>
                              <textarea
                                value={activeDraft.inclusions}
                                onChange={(e) => setDraft(activeDraft.key, { inclusions: e.target.value })}
                                rows={4}
                                placeholder="Write what is included (labour, material brands, drawings, approvals etc.)"
                                style={styles.textarea}
                              />
                            </div>

                            <div style={styles.field}>
                              <span style={styles.label}>Exclusions</span>
                              <textarea
                                value={activeDraft.exclusions}
                                onChange={(e) => setDraft(activeDraft.key, { exclusions: e.target.value })}
                                rows={4}
                                placeholder="Write what is NOT included"
                                style={styles.textarea}
                              />
                            </div>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <span style={styles.label}>Other notes</span>
                            <textarea
                              value={activeDraft.notes}
                              onChange={(e) => setDraft(activeDraft.key, { notes: e.target.value })}
                              rows={3}
                              placeholder="Any extra terms, site conditions, drawing/approval requirements etc."
                              style={styles.textarea}
                            />
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          </div>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <div style={{ marginTop: 14 }}>
            <Card>
              <CardBody>
                <div style={styles.toolbar}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Step 3: Review & Save</div>
                    <div style={{ color: "#5b6472", fontSize: 13 }}>
                      Only enabled packages will be saved. Then choose draft or publish.
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button onClick={() => setStep(2)} style={styles.miniBtn()}>
                      ← Back to Step 2
                    </button>
                    <button onClick={() => setStep(1)} style={styles.miniBtn()}>
                      ← Back to Step 1
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  {enabledCount() === 0 ? (
                    <EmptyState message="No enabled packages. Go back to Step 1 and enable at least one." />
                  ) : (
                    <Grid min={320} gap={12}>
                      {drafts
                        .filter((d) => d.enabled)
                        .map((d) => {
                          const t = templates.find((x) => x.template_code === d.template_code);
                          const title =
                            (t?.marketing_title ?? "").trim() || (t?.public_label ?? "").trim() || d.template_code;

                          return (
                            <Card key={d.key}>
                              <CardBody>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                  <div style={{ fontWeight: 900 }}>
                                    {title}
                                    <div style={{ ...styles.minor, marginTop: 2 }}>{d.template_code}</div>
                                  </div>
                                  <Badge>Enabled</Badge>
                                </div>

                                <div style={{ marginTop: 10, ...styles.minor }}>
                                  Rate: <b>₹{d.vendor_rate_per_sqft ?? "—"}</b>/sqft • GST:{" "}
                                  <b>{d.gst_applicable ? `Yes (${d.gst_pct ?? "—"}%)` : "No"}</b>
                                </div>

                                <div style={{ marginTop: 6, ...styles.minor }}>
                                  Coverage: <b>{d.coverage_area || "—"}</b> • Start:{" "}
                                  <b>{d.expected_start_time || "—"}</b> • Duration:{" "}
                                  <b>{d.estimated_duration || "—"}</b>
                                </div>

                                <div style={{ marginTop: 10, ...styles.box }}>
                                  <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Payment milestones</div>
                                  <div style={{ color: "#5b6472", fontSize: 13, whiteSpace: "pre-wrap" }}>
                                    {d.payment_milestones
                                      .map((m) => `• ${m.label}: ${m.pct ?? "—"}%`)
                                      .join("\n")}
                                    {"\n"}
                                    <b>Total:</b> {pctSum(d.payment_milestones)}%
                                  </div>
                                </div>

                                {(d.inclusions || d.exclusions || d.notes) ? (
                                  <div style={{ marginTop: 10, ...styles.box }}>
                                    <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>Notes</div>
                                    {d.inclusions ? (
                                      <div style={{ ...styles.minor, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                                        <b>Inclusions:</b>{"\n"}
                                        {d.inclusions}
                                      </div>
                                    ) : null}
                                    {d.exclusions ? (
                                      <div style={{ ...styles.minor, whiteSpace: "pre-wrap", marginBottom: 8 }}>
                                        <b>Exclusions:</b>{"\n"}
                                        {d.exclusions}
                                      </div>
                                    ) : null}
                                    {d.notes ? (
                                      <div style={{ ...styles.minor, whiteSpace: "pre-wrap" }}>
                                        <b>Other:</b>{"\n"}
                                        {d.notes}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </CardBody>
                            </Card>
                          );
                        })}
                    </Grid>
                  )}
                </div>
              </CardBody>

              <CardFooter>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#5b6472", fontSize: 13 }}>
                    Enabled: <b>{enabledCount()}</b> package(s)
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => saveAll("draft")}
                      disabled={saving || enabledCount() === 0}
                      style={{
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: saving || enabledCount() === 0 ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        opacity: saving || enabledCount() === 0 ? 0.6 : 1,
                      }}
                    >
                      {saving ? "Saving..." : "Save Draft"}
                    </button>

                    <button
                      onClick={() => saveAll("published")}
                      disabled={saving || enabledCount() === 0}
                      style={{
                        border: "1px solid #111827",
                        background: "#111827",
                        color: "#fff",
                        padding: "10px 12px",
                        borderRadius: 12,
                        cursor: saving || enabledCount() === 0 ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        opacity: saving || enabledCount() === 0 ? 0.6 : 1,
                      }}
                    >
                      {saving ? "Publishing..." : "Publish"}
                    </button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        ) : null}
      </Container>

      <style jsx global>{`
        header,
        footer {
          display: none !important;
        }
        body {
          background: #f8fafc;
        }
      `}</style>
    </main>
  );
}

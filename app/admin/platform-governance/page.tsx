import { redirect } from "next/navigation";

import { THREE_BOS_AI_AGENTS } from "@/lib/3bos/ai-agents/registry";
import { CAPABILITY_REGISTRY, GROWTH_PLAN_REGISTRY } from "@/lib/3bos/capability/registry";
import { HUMAN_IDENTITY_REGISTRY } from "@/lib/3bos/identity/registry";
import { WORKSPACE_REGISTRY } from "@/lib/3bos/workspace/registry";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";
import { BTCE_DEFAULT_DOMAIN_WEIGHTS, BTCE_VERSION } from "@/lib/btce/shared/constants";
import { i18nConfig } from "@/lib/i18n/config";
import { MEDIA_BUCKET_BY_MODULE, UNIVERSAL_MEDIA_LIMITS } from "@/lib/media/media-config";

export const dynamic = "force-dynamic";

type CountResult = { label: string; count: number | null; issue?: string };

const marketplaceWeights = [
  ["Location", "20%"], ["Relevance", "18%"], ["Reputation", "17%"],
  ["Boost", "15%"], ["Revenue", "15%"], ["Trust", "10%"],
] as const;

function readiness(parts: boolean[]) {
  const configured = parts.filter(Boolean).length;
  if (configured === parts.length) return "Configured";
  if (configured > 0) return "Partial";
  return "Not configured";
}

export default async function PlatformGovernanceCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/platform-governance");
    return <main>Access denied</main>;
  }

  const authorities = [
    ["Identity master", "identity_master", "/admin/dashboard/master-data"],
    ["Operating capabilities", "bos_operating_capabilities", "/admin/dashboard/master-data"],
    ["Registration redirects", "registration_redirect_rules", "/admin/dashboard/master-data"],
    ["Measurement units", "measurement_units", "/admin/dashboard/master-data"],
    ["Geography states", "geo_states", "/admin/dashboard/geography"],
    ["Geography districts", "geo_districts", "/admin/dashboard/geography"],
  ] as const;

  const counts: CountResult[] = await Promise.all(authorities.map(async ([label, table]) => {
    const { count, error } = await access.admin.from(table).select("*", { count: "exact", head: true });
    return error ? { label, count: null, issue: error.message } : { label, count: count ?? 0 };
  }));

  const auditAuthorities = ["identity_master_audit", "member_role_transition_audit", "registration_verification_events"];
  const auditCounts = await Promise.all(auditAuthorities.map(async (table) => {
    const { count, error } = await access.admin.from(table).select("*", { count: "exact", head: true });
    return { table, count: error ? null : count ?? 0, issue: error?.message };
  }));

  const integrations = [
    ["Supabase public client", readiness([Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)])],
    ["Supabase privileged server", readiness([Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)])],
    ["OpenAI", readiness([Boolean(process.env.OPENAI_API_KEY)])],
    ["SBI payment gateway", readiness([process.env.SBI_PAYMENT_GATEWAY_ENABLED === "true", Boolean(process.env.SBI_PAYMENT_GATEWAY_MERCHANT_ID), Boolean(process.env.SBI_PAYMENT_GATEWAY_REQUEST_URL)])],
    ["WhatsApp Cloud", readiness([Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN), Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID)])],
    ["Gupshup", readiness([Boolean(process.env.GUPSHUP_API_KEY), Boolean(process.env.GUPSHUP_SOURCE_NUMBER || process.env.GUPSHUP_SOURCE_PHONE)])],
    ["Firebase", readiness([Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)])],
    ["Google Maps", readiness([Boolean(process.env.GOOGLE_MAPS_API_KEY)])],
  ] as const;

  const agents = THREE_BOS_AI_AGENTS;
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };
  const issues = [...counts.flatMap((item) => item.issue ? [`${item.label}: ${item.issue}`] : []), ...auditCounts.flatMap((item) => item.issue ? [`${item.table}: ${item.issue}`] : [])];

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Platform Configuration & Governance</h1>
        <p>Read-only ownership map for platform registries, master data, AI policy, integrations and governance coverage.</p>
        <p><strong>Secret values are never displayed.</strong> This center cannot change runtime configuration.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue) => <p key={issue}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Code identities", Object.keys(HUMAN_IDENTITY_REGISTRY).length],
          ["Capabilities", Object.keys(CAPABILITY_REGISTRY).length],
          ["Workspaces", Object.keys(WORKSPACE_REGISTRY).length],
          ["AI agents", agents.length],
          ["Growth plans", Object.keys(GROWTH_PLAN_REGISTRY).length],
          ["Locales", i18nConfig.locales.length],
        ].map(([label, value]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>Code-governed registry</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Canonical master-data authorities</h2>
          {authorities.map(([label, , href]) => { const result = counts.find((item) => item.label === label); return <p key={label}><strong>{label}</strong>: {result?.count ?? "Unavailable"} · <a href={href}>Open authority</a></p>; })}
          <p>Changes continue through their existing master-data and geography workflows.</p>
        </article>

        <article style={panel}>
          <h2>AI governance</h2>
          <p><strong>{agents.filter((agent) => agent.enabled).length}</strong> enabled agents; <strong>{agents.filter((agent) => agent.requiresConfirmation).length}</strong> require confirmation according to the registry.</p>
          <p>Agent endpoints, availability and risk are code-governed. Central prompt versions, model versions, evaluation runs, approvals and overrides are not yet governed by one durable authority.</p>
          <a href="/admin/moderation">Open AI Moderation</a>
        </article>

        <article style={panel}>
          <h2>Trust and matching policy</h2>
          <p><strong>{BTCE_VERSION}</strong>: {BTCE_DEFAULT_DOMAIN_WEIGHTS.map((item) => `${item.domain} ${item.weight}%`).join(" · ")}</p>
          <p><strong>Marketplace matching:</strong> {marketplaceWeights.map(([label, value]) => `${label} ${value}`).join(" · ")}</p>
          <p>These weights are currently code-defined, not versioned administrator configuration.</p>
        </article>

        <article style={panel}>
          <h2>Integration readiness</h2>
          {integrations.map(([name, status]) => <p key={name}><strong>{name}</strong>: {status}</p>)}
          <p>Readiness indicates presence only. It does not validate credentials, connectivity, rotation or environment parity.</p>
        </article>

        <article style={panel}>
          <h2>Media and locale policy</h2>
          <p><strong>{Object.keys(MEDIA_BUCKET_BY_MODULE).length}</strong> media modules; maximum {UNIVERSAL_MEDIA_LIMITS.maxFiles} files per upload operation.</p>
          <p>Default locale: {i18nConfig.defaultLocale}; {i18nConfig.locales.length} supported locale codes.</p>
          <p>Media limits, bucket routing and locales remain code-controlled.</p>
        </article>

        <article style={panel}>
          <h2>Distributed audit coverage</h2>
          {auditCounts.map((item) => <p key={item.table}><strong>{item.table.replaceAll("_", " ")}</strong>: {item.count ?? "Unavailable"}</p>)}
          <p>These domain audits are authoritative for their domains; they do not form a unified platform-configuration audit explorer.</p>
        </article>

        <article style={panel}>
          <h2>Configuration ownership</h2>
          <p><a href="/admin/construction-control">Construction rates</a> · <a href="/admin/revenue-control">Plans and payments</a> · <a href="/admin/dashboard/geography">Geography</a> · <a href="/admin/dashboard/master-data">Master data</a> · <a href="/admin/content-communications">Communications</a></p>
          <p>Each existing domain remains authoritative. This center does not create a competing source of truth.</p>
        </article>

        <article style={panel}>
          <h2>Governance gaps</h2>
          <p><strong>Not centrally implemented:</strong> feature flags, versioned platform settings, approval workflow, separation of duties, scheduled activation, rollback, environment drift reporting, API and webhook registry, secret-rotation metadata and unified configuration audit.</p>
          <p>Future configuration commands require an additive schema, RLS, immutable audit and migration approval. No migration is introduced in ADMIN-13.</p>
        </article>
      </section>
    </main>
  );
}

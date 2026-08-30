import { redirect } from "next/navigation";

import {
  CONSTRUCTION_GRADES,
  DEFAULT_CONSTRUCTION_COST_SPLIT,
  DEFAULT_COST_ENGINE_ASSUMPTIONS,
  FLOOR_COST_MULTIPLIERS,
  REGIONAL_COST_MULTIPLIERS,
} from "@/lib/construction-cost/cost-config";
import { GRADE_MULTIPLIERS } from "@/lib/construction-cost/grade-multipliers";
import { EXACT_PWD_ITEMS } from "@/lib/construction-cost/pwd-item-exact-rates";
import { PWD_CORE_SOR_ITEMS, PWD_DISTRICT_CHARGES } from "@/lib/construction-cost/pwd-sor-rates";
import { requireMasterAdmin } from "@/lib/admin/requireMasterAdmin";

export const dynamic = "force-dynamic";

type QueryResult = { data: any[] | null; error: { message: string } | null };

const clean = (value: unknown) => String(value ?? "—").replaceAll("_", " ");
const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default async function ConstructionControlCenter() {
  const access = await requireMasterAdmin();
  if ("error" in access) {
    if (access.status === 401) redirect("/login?next=/admin/construction-control");
    return <main>Access denied</main>;
  }

  const [projects, milestones, snapshots, prices] = (await Promise.all([
    access.admin
      .from("construction_projects")
      .select("id,user_id,title,city,built_up_area_sqft,floor_count,grade,status,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000),
    access.admin
      .from("construction_project_milestones")
      .select("id,project_id,title,status,priority,planned_end_date,progress_percent,updated_at")
      .order("updated_at", { ascending: false })
      .limit(2000),
    access.admin
      .from("construction_project_snapshots")
      .select("id,project_id,snapshot_type,created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    access.admin
      .from("material_price_updates")
      .select("id,category,item,price_min,price_max,unit,location,verified,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ])) as QueryResult[];

  const issues = [projects, milestones, snapshots, prices].flatMap((result) => result.error ? [result.error.message] : []);
  const projectRows = projects.data || [];
  const milestoneRows = milestones.data || [];
  const priceRows = prices.data || [];
  const activeProjects = projectRows.filter((row) => !["completed", "cancelled"].includes(row.status));
  const atRiskMilestones = milestoneRows.filter((row) => row.priority === "high" || row.status === "blocked" || (row.planned_end_date && Date.parse(row.planned_end_date) < Date.now() && row.status !== "completed"));
  const verifiedPrices = priceRows.filter((row) => row.verified === true);
  const indicativeItems = PWD_CORE_SOR_ITEMS.filter((item) => item.code.includes("INDICATIVE"));
  const panel = { padding: 16, background: "white", border: "1px solid #dbe3ec", borderRadius: 12 };

  return (
    <main style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <header>
        <h1>Construction OS Control Center</h1>
        <p>Authoritative visibility over estimator configuration, regional rates, PWD/SOR coverage, live prices and project execution.</p>
        <a href="/admin/dashboard">← Admin Command Center</a>
      </header>

      {issues.length ? <details style={{ marginTop: 12 }}><summary>Partial data notice ({issues.length})</summary>{issues.map((issue, index) => <p key={`${issue}-${index}`}>{issue}</p>)}</details> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "18px 0" }}>
        {[
          ["Active projects", activeProjects.length, "Planning through execution"],
          ["At-risk milestones", atRiskMilestones.length, "High, blocked or overdue"],
          ["Project snapshots", snapshots.data?.length || 0, "Bounded plan history"],
          ["Verified market prices", verifiedPrices.length, `${priceRows.length} recent submissions`],
          ["Exact PWD items", EXACT_PWD_ITEMS.length, "Explicit schedule mappings"],
          ["Indicative PWD items", indicativeItems.length, "Not exact schedule authority"],
        ].map(([label, value, helper]) => <article key={String(label)} style={panel}><small>{label}</small><strong style={{ display: "block", fontSize: 28 }}>{value}</strong><span>{helper}</span></article>)}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 12 }}>
        <article style={panel}>
          <h2>Grade rate authority</h2>
          {Object.values(CONSTRUCTION_GRADES).map((grade) => <p key={grade.grade}><strong>{grade.label}</strong> · {money(grade.baseRatePerSqFt)}/sq.ft.<br />Range {money(grade.minRatePerSqFt)}–{money(grade.maxRatePerSqFt)} · Material factor {GRADE_MULTIPLIERS[grade.grade].materialMultiplier}</p>)}
          <p>Default: {clean(DEFAULT_COST_ENGINE_ASSUMPTIONS.defaultGrade)} · Area {DEFAULT_COST_ENGINE_ASSUMPTIONS.minimumBuiltUpArea.toLocaleString("en-IN")}–{DEFAULT_COST_ENGINE_ASSUMPTIONS.maximumBuiltUpArea.toLocaleString("en-IN")} sq.ft.</p>
        </article>

        <article style={panel}>
          <h2>Regional & floor configuration</h2>
          {Object.entries(REGIONAL_COST_MULTIPLIERS).map(([region, multiplier]) => <p key={region}><strong>{clean(region)}</strong> · ×{multiplier}</p>)}
          <p>Floor factors: {Object.entries(FLOOR_COST_MULTIPLIERS).map(([floor, factor]) => `${floor}F ×${factor}`).join(" · ")}</p>
          <p>Cost split: materials {DEFAULT_CONSTRUCTION_COST_SPLIT.materials * 100}% · labour {DEFAULT_CONSTRUCTION_COST_SPLIT.labour * 100}% · finishing {DEFAULT_CONSTRUCTION_COST_SPLIT.finishing * 100}%.</p>
        </article>

        <article style={panel}>
          <h2>PWD/SOR coverage</h2>
          <p><strong>{EXACT_PWD_ITEMS.length}</strong> exact items and <strong>{PWD_CORE_SOR_ITEMS.length}</strong> core schedule items are compiled into the engine.</p>
          <p><strong>{PWD_DISTRICT_CHARGES.length}</strong> district-charge rules are configured.</p>
          {indicativeItems.map((item) => <p key={item.code}><strong>Indicative: {item.label}</strong><br />{item.sourceNote}</p>)}
          <p>Indicative entries must not be represented as fully extracted official schedule items.</p>
        </article>

        <article style={panel}>
          <h2>Governance status</h2>
          <p>Rates, multipliers, cost splits, PWD items and market-adjustment factors are code-configured.</p>
          <p><strong>Versioned approval and rollback are not yet available.</strong> This center is intentionally read-only until a governed configuration authority is approved.</p>
          <p>“Price Today” factors include static adjustment logic; verified live submissions remain separately authoritative.</p>
          <a href="/admin/dashboard/price-updates">Open Price Verification</a>{" · "}<a href="/construction-cost">Open Estimator</a>
        </article>

        <article style={panel}>
          <h2>Project execution health</h2>
          {activeProjects.slice(0, 12).map((project) => <p key={project.id}><strong>{project.title}</strong><br />{clean(project.status)} · {clean(project.grade)} · {Number(project.built_up_area_sqft).toLocaleString("en-IN")} sq.ft. · {project.city || "Location unavailable"}</p>)}
          {!activeProjects.length ? <p>No active project in the bounded projection.</p> : null}
          <a href="/dashboard/construction-projects">Open Construction Projects</a>
        </article>

        <article style={panel}>
          <h2>Milestones requiring attention</h2>
          {atRiskMilestones.slice(0, 12).map((milestone) => <p key={milestone.id}><strong>{milestone.title}</strong><br />{clean(milestone.status)} · {clean(milestone.priority)} priority · {milestone.progress_percent}% complete</p>)}
          {!atRiskMilestones.length ? <p>No at-risk milestone in the bounded projection.</p> : null}
          <p>Project updates remain owned by the existing construction-project APIs and user workspace.</p>
        </article>
      </section>
    </main>
  );
}

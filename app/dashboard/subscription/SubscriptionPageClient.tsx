"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SUBSCRIPTION_PLANS,
  COMMERCIAL_PRODUCTS,
  priceLabel,
} from "@/lib/payments/catalogue";
import RazorpayPurchaseButton from "@/components/payments/RazorpayPurchaseButton";
export default function SubscriptionPageClient() {
  const params = useSearchParams();
  const rawReturn = params.get("return") || "/dashboard/workspace";
  const returnTo =
    rawReturn.startsWith("/") &&
    !rawReturn.startsWith("//") &&
    !/[\\\u0000-\u001f]/.test(rawReturn)
      ? rawReturn
      : "/dashboard/workspace";
  const [workspace, setWorkspace] = useState<any>(null);
  const [error, setError] = useState("");
  const [project, setProject] = useState("");
  const [sourceProject, setSourceProject] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/payments/razorpay/workspace", {
        cache: "no-store",
      });
      if (r.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setWorkspace(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const active = (workspace?.entitlements || []).filter(
    (e: any) =>
      Date.parse(e.starts_at) <= Date.now() &&
      (!e.ends_at || Date.parse(e.ends_at) > Date.now()),
  );
  const base = active.filter((e: any) => e.kind === "base").at(-1);
  const pack = active.find((e: any) => e.kind === "property_pack");
  const panel = {
    padding: 20,
    border: "1px solid #dbe3ec",
    borderRadius: 16,
    background: "white",
  };
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "auto",
        padding: "28px 18px",
        color: "#0f172a",
      }}
    >
      <Link href={returnTo}>← Return to My Work</Link>
      <h1>Affordable plans for your whole business</h1>
      <p>
        One business subscription across building materials, rentals,
        professional and legal services, turnkey construction and property.
        Manufacturing costs, inventory and marketplace work stay connected.
      </p>
      <p>
        Monthly totals include applicable tax. Renew when you choose; no
        automatic debit. Optional services are charged separately. Customers pay
        vendors directly.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {!workspace ? (
        <p>Loading your business plans…</p>
      ) : (
        <>
          <section style={panel}>
            <strong>
              Current access:{" "}
              {base?.product?.replaceAll("_vendor", "") || "Essential"}
            </strong>
            <p>
              {base?.ends_at
                ? `Paid through ${new Date(base.ends_at).toLocaleDateString("en-IN")}`
                : base
                  ? "Complimentary access has no recorded expiry."
                  : "Your Essential workspace remains available."}
            </p>
            {!workspace.gatewayReady ? (
              <p>
                Razorpay payments are being configured. Your current access
                remains available.
              </p>
            ) : null}
            <p>
              Trust and verification depend on your verified identity and
              evidence, independently of your subscription. Plans do not
              guarantee enquiries or sales.
            </p>
          </section>
          <h2>Business plans</h2>
          {workspace.testMode ? (
            <p role="status">
              Test checkout is enabled. Test payments do not collect real money.
            </p>
          ) : null}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
              gap: 12,
            }}
          >
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, p]) => (
              <article key={key} style={panel}>
                <h3>{p.label}</h3>
                {params.get("plan") === key ? (
                  <p>
                    <strong>Selected during registration</strong>
                  </p>
                ) : null}
                <strong>{priceLabel(p.amountPaise)}</strong>
                <p>
                  Business workspace across your enabled segments. Includes one
                  active property listing.
                </p>
                <p>
                  Marketplace matching support:{" "}
                  {key === "platinum_vendor"
                    ? 20
                    : key === "gold_vendor"
                      ? 10
                      : key === "silver_vendor"
                        ? 5
                        : 3}{" "}
                  plan points. Relevance, location and verified business
                  information also affect matching.
                </p>
                <RazorpayPurchaseButton
                  product={key}
                  label={
                    base?.product === key
                      ? "Renew with Razorpay"
                      : "Choose plan"
                  }
                  disabled={
                    !workspace.gatewayReady ||
                    (Boolean(base) && base.product !== key) ||
                    Boolean(base && !base.ends_at)
                  }
                  onComplete={load}
                />
              </article>
            ))}
          </div>
          <p>
            Use the tools available to your business identity. Existing
            Essential features remain available. Switching an active tier is
            available after expiry; renewal preserves remaining paid time.
          </p>
          <h2>Optional extra property capacity</h2>
          <p>
            One account-level pack across your projects. A linked plot/flat and
            its listing count once. Drafts, sold and archived listings do not
            consume capacity.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: 12,
            }}
          >
            {["property_5", "property_20", "property_50"].map((key) => {
              const p = COMMERCIAL_PRODUCTS[key];
              return (
                <article key={key} style={panel}>
                  <h3>{p.label}</h3>
                  <strong>{priceLabel(p.amountPaise)}</strong>
                  <p>
                    {p.allowance + 1} active properties including the base
                    allowance.
                  </p>
                  <RazorpayPurchaseButton
                    product={key}
                    label={pack?.product === key ? "Renew pack" : "Buy pack"}
                    disabled={
                      !workspace.gatewayReady ||
                      !base ||
                      (Boolean(pack) && pack.product !== key)
                    }
                    onComplete={load}
                  />
                </article>
              );
            })}
          </div>
          <h2>Production and project costing</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 12,
            }}
          >
            <article style={panel}>
              <h3>Manufacturing-cost workspace</h3>
              <strong>₹99 / month</strong>
              <p>
                Available to business identities enabled for manufacturing
                costing. Up to five active product/batch registers. Track
                production costs and continue through stock, finished outputs
                and marketplace inventory. Archived records remain readable.
              </p>
              <RazorpayPurchaseButton
                product="manufacturing"
                label="Activate or renew manufacturing costing"
                disabled={
                  !workspace.gatewayReady ||
                  !base ||
                  !workspace.capabilities.manufacturing
                }
                onComplete={load}
              />
              <p>
                <Link href="/dashboard/cost-register?mode=product">
                  Open manufacturing cost register →
                </Link>
              </p>
            </article>
            <article style={panel}>
              <h3>Construction and turnkey project costing</h3>
              <strong>₹99 / project / month</strong>
              <p>
                Available to business identities enabled for project costing.
                Track one project’s BOQ, purchases, consumption and actual
                costs. Floors and cost centres within that register share its
                charge. Basic estimates remain free.
              </p>
              <label>
                Project cost register
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  style={{ display: "block", padding: 10, maxWidth: "100%" }}
                >
                  <option value="">Select your project</option>
                  {workspace.projects
                    .filter(
                      (p: any) =>
                        p.operating_mode === "project" &&
                        !["completed", "archived"].includes(p.status),
                    )
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </label>
              <p>
                Create a draft project register first, or link an existing
                construction/builder project. The same linked project uses one
                costing subscription across its estimate, execution and
                register.
              </p>
              <label>
                Link an existing project
                <select
                  value={sourceProject}
                  onChange={(e) => setSourceProject(e.target.value)}
                  style={{ display: "block", padding: 10, maxWidth: "100%" }}
                >
                  <option value="">Choose project to link</option>
                  {workspace.constructionProjects.map((p: any) => (
                    <option key={p.id} value={`construction_project:${p.id}`}>
                      {p.title} · construction
                    </option>
                  ))}
                  {workspace.builderProjects.map((p: any) => (
                    <option key={p.id} value={`builder_project:${p.id}`}>
                      {p.name} · builder
                    </option>
                  ))}
                </select>
              </label>
              <p>
                <button
                  type="button"
                  disabled={!sourceProject}
                  onClick={async () => {
                    const [projectType, projectId] = sourceProject.split(":");
                    const r = await fetch(
                      "/api/payments/razorpay/project-register",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId, projectType }),
                      },
                    );
                    const d = await r.json();
                    if (!r.ok) setError(d.error);
                    else {
                      await load();
                      setProject(d.registerId);
                    }
                  }}
                >
                  Link existing project register
                </button>
              </p>
              <RazorpayPurchaseButton
                product="construction"
                resourceId={project}
                label="Activate or renew this project"
                disabled={
                  !workspace.gatewayReady ||
                  !base ||
                  !project ||
                  !workspace.capabilities.construction
                }
                onComplete={load}
              />
              <p>
                <Link href="/dashboard/cost-register?mode=project">
                  Open project cost register →
                </Link>
              </p>
            </article>
          </div>
          <h2>Purchased services</h2>
          {active
            .filter((e: any) => e.kind !== "base")
            .map((e: any) => (
              <p key={e.id}>
                {COMMERCIAL_PRODUCTS[e.product]?.label || e.product} ·{" "}
                {e.ends_at
                  ? `paid through ${new Date(e.ends_at).toLocaleDateString("en-IN")}`
                  : "ongoing"}
              </p>
            ))}
          <h2>Payment history</h2>
          <button type="button" onClick={load}>
            Refresh payment status
          </button>
          <p>
            These are captured payments and refunds, not bank settlement
            confirmations.
          </p>
          {workspace.purchases.map((o: any) => (
            <article key={o.id} style={{ ...panel, marginBottom: 8 }}>
              <strong>
                {o.label} · ₹{o.amount_paise / 100}
              </strong>
              <p>
                {`${o.gateway_mode} · ${o.status.replaceAll("_", " ")}`} ·{" "}
                {new Date(o.created_at).toLocaleDateString("en-IN")}
                {o.refunded_paise
                  ? ` · refunded ₹${o.refunded_paise / 100}`
                  : ""}
              </p>
              {["review_required", "checkout_ready"].includes(o.status) ? (
                <button
                  onClick={async () => {
                    const r = await fetch("/api/payments/razorpay/workspace", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ purchaseId: o.id }),
                    });
                    const d = await r.json();
                    await load();
                    if (!r.ok || d.status !== "paid")
                      setError(
                        d.error ||
                          "Payment or review is still pending. Do not pay again.",
                      );
                  }}
                >
                  Recheck payment and access
                </button>
              ) : null}
            </article>
          ))}
          <p>
            <Link href="/refund-cancellation-policy">
              Refund and cancellation policy
            </Link>{" "}
            · <Link href="/contact">Contact support</Link>
          </p>
        </>
      )}
    </main>
  );
}

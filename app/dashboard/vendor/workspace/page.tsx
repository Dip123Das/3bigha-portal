"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const operationalFeed = [
  {
    id: 1,
    type: "inventory",
    title: "Inventory updated",
    message: "ACC Cement stock adjusted",
    time: "5 min ago",
  },
  {
    id: 2,
    type: "billing",
    title: "Invoice generated",
    message: "Invoice #INV-204 created",
    time: "12 min ago",
  },
  {
    id: 3,
    type: "rental",
    title: "Rental booked",
    message: "JCB booking confirmed",
    time: "24 min ago",
  },
  {
    id: 4,
    type: "service",
    title: "Service assigned",
    message: "Electrical work order assigned",
    time: "40 min ago",
  },
];

const workspaceModules = [
  {
    title: "Inventory",
    description: "Stock, valuation, movement and operational inventory.",
    href: "/dashboard/vendor/inventory",
    metrics: [
      ["Items", "248"],
      ["Low Stock", "6"],
    ],
  },
  {
    title: "Billing",
    description: "Invoices, dues, payment tracking and ERP billing.",
    href: "/dashboard/vendor/billing",
    metrics: [
      ["Invoices", "126"],
      ["Pending", "₹48K"],
    ],
  },
  {
    title: "Rental ERP",
    description: "Assets, bookings, returns and availability.",
    href: "/rentals/my",
    metrics: [
      ["Active", "12"],
      ["Returning", "2"],
    ],
  },
  {
    title: "Service ERP",
    description: "Estimates, work orders and execution tracking.",
    href: "/services/my",
    metrics: [
      ["Jobs", "9"],
      ["Running", "4"],
    ],
  },
  {
    title: "Ledger",
    description: "Customer dues, advances and collections.",
    href: "/dashboard/vendor/billing",
    metrics: [
      ["Outstanding", "₹1.2L"],
      ["Collected", "₹42K"],
    ],
  },
  {
    title: "Procurement",
    description: "RFQs, procurement continuity and vendor sourcing.",
    href: "/dashboard/vendor/rfqs",
    metrics: [
      ["RFQs", "5"],
      ["Urgent", "1"],
    ],
  },
];

const quickActions = [
  {
    title: "Create Invoice",
    href: "/dashboard/vendor/billing",
  },
  {
    title: "Add Inventory",
    href: "/dashboard/vendor/inventory",
  },
  {
    title: "Rental Booking",
    href: "/rentals/my",
  },
  {
    title: "Service Work Order",
    href: "/services/my",
  },
  {
    title: "Create RFQ",
    href: "/rfq/new",
  },
  {
    title: "Dispatch Center",
    href: "/dashboard/vendor/dispatch",
  },
];

export default function VendorWorkspacePage() {

  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [stats, setStats] = useState({
    inventoryCount: 0,
    pendingDue: 0,
    rentalCount: 0,
    serviceCount: 0,
    rfqCount: 0,
    dispatchCount: 0,
    overdueRentals: 0,
    overdueServices: 0,
    healthScore: 100,
    totalRevenue: 0,
    paidRevenue: 0,
    unpaidInvoices: 0,
    anomalyScore: 0,
    forecastPressure: "Stable",
    collectionEfficiency: 100,
    erpMaturityScore: 0,
    executionVelocity: "Moderate",
    profitabilitySignal: "Stable",
  });

  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [executiveAlerts, setExecutiveAlerts] = useState<string[]>([]);
  const [priorityActions, setPriorityActions] = useState<string[]>([]);
  const [autonomousRecommendations, setAutonomousRecommendations] = useState<string[]>([]);
  const [anomalySignals, setAnomalySignals] = useState<string[]>([]);
  const [forecastSignals, setForecastSignals] = useState<string[]>([]);
  const [recoveryActions, setRecoveryActions] = useState<string[]>([]);
  const [workloadSignals, setWorkloadSignals] = useState<string[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [collapsedSignals, setCollapsedSignals] = useState<string[]>([]);
  const [throughputSignals, setThroughputSignals] = useState<string[]>([]);
  const [throughputScore, setThroughputScore] = useState<number>(0);
  const [profitabilityForecast, setProfitabilityForecast] = useState<string>("Stable");
  const [orchestrationSignals, setOrchestrationSignals] = useState<string[]>([]);
  const [clusterSignals, setClusterSignals] = useState<string[]>([]);
  const [momentumSignals, setMomentumSignals] = useState<string[]>([]);
  const [automationSignals, setAutomationSignals] = useState<string[]>([]);
  const [stabilizationSignals, setStabilizationSignals] = useState<string[]>([]);
  const [momentumScore, setMomentumScore] = useState<number>(0);

  const compactExecutiveSignals = [
    ...clusterSignals,
    ...automationSignals,
    ...stabilizationSignals,
  ].slice(0, 6);



  useEffect(() => {
    async function loadWorkspace() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [
        inventoryRes,
        rentalRes,
        serviceRes,
        ledgerRes,
        billingRes,
        eventsRes,
      ] = await Promise.all([
        supabase
          .from("inventory_entities")
          .select("id", { count: "exact" }),

        supabase
          .from("rental_bookings")
          .select("id", { count: "exact" }),

        supabase
          .from("service_work_orders")
          .select("id", { count: "exact" }),

        supabase
          .from("customer_ledgers")
          .select("balance_amount"),

        supabase
          .from("inventory_bills")
          .select("total_amount,payment_status"),

        supabase
          .from("operational_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);


      const now = new Date();

      const overdueRentals =
        (eventsRes.data || []).filter(
          (e: any) =>
            e.event_type === "rental_booking_created"
        ).length > 5
          ? 2
          : 0;

      const overdueServices =
        (serviceRes.count || 0) > 6
          ? 1
          : 0;


      const totalRevenue =
        (billingRes.data || []).reduce(
          (sum: number, row: any) =>
            sum + Number(row.total_amount || 0),
          0
        );

      const paidRevenue =
        (billingRes.data || [])
          .filter(
            (row: any) =>
              row.payment_status === "paid"
          )
          .reduce(
            (sum: number, row: any) =>
              sum + Number(row.total_amount || 0),
            0
          );


      const collectionEfficiency =
        totalRevenue > 0
          ? Math.round(
              (paidRevenue / totalRevenue) * 100
            )
          : 100;

      const unpaidInvoices =
        (billingRes.data || []).filter(
          (row: any) =>
            row.payment_status !== "paid"
        ).length;

      const pendingDue =
        ledgerRes.data?.reduce(
          (sum, row) => sum + Number(row.balance_amount || 0),
          0
        ) || 0;


      let anomalyScore = 0;

      if (unpaidInvoices > 5) {
        anomalyScore += 25;
      }

      if (pendingDue > 150000) {
        anomalyScore += 30;
      }

      if (overdueRentals > 2) {
        anomalyScore += 20;
      }

      if (overdueServices > 2) {
        anomalyScore += 15;
      }

      const forecastPressure =
        anomalyScore >= 50
          ? "High"
          : anomalyScore >= 25
          ? "Moderate"
          : "Stable";


      const healthScore =
        Math.max(
          35,
          100
            - overdueRentals * 10
            - overdueServices * 8
            - (pendingDue > 100000 ? 12 : 0)
        );

      const erpMaturityScore =
        Math.min(
          100,
          40
            + collectionEfficiency * 0.3
            + healthScore * 0.3
            + (paidRevenue > 0 ? 15 : 0)
            + (inventoryRes.count || 0) * 0.5
        );

      const executionVelocity =
        overdueServices > 1
          ? "Slow"
          : overdueServices > 0
          ? "Moderate"
          : "Fast";

      const profitabilitySignal =
        collectionEfficiency >= 75
          ? "Healthy"
          : collectionEfficiency >= 50
          ? "Watch"
          : "Risk";

      setStats({
        inventoryCount: inventoryRes.count || 0,
        pendingDue,
        rentalCount: rentalRes.count || 0,
        serviceCount: serviceRes.count || 0,
        rfqCount: 0,
        dispatchCount: 0,
        overdueRentals,
        overdueServices,
        healthScore,
        totalRevenue,
        paidRevenue,
        unpaidInvoices,
        anomalyScore,
        forecastPressure,
        collectionEfficiency,
        erpMaturityScore,
        executionVelocity,
        profitabilitySignal,
      });


      const alerts: string[] = [];

      if ((inventoryRes.count || 0) < 5) {
        alerts.push(
          "Inventory levels critically low."
        );
      }

      if (pendingDue > 100000) {
        alerts.push(
          "Outstanding customer dues are high."
        );
      }

      if ((rentalRes.count || 0) > 10) {
        alerts.push(
          "Rental operations require monitoring."
        );
      }

      if ((serviceRes.count || 0) > 8) {
        alerts.push(
          "High active service workload detected."
        );
      }

      setExecutiveAlerts(alerts);

      const priorities: string[] = [];

      if (overdueRentals > 0) {
        priorities.push(
          "Overdue rental returns require follow-up."
        );
      }

      if (overdueServices > 0) {
        priorities.push(
          "Service execution delays detected."
        );
      }

      if (pendingDue > 50000) {
        priorities.push(
          "Customer collections need attention."
        );
      }

      setPriorityActions(priorities);

      const recommendations: string[] = [];

      if (unpaidInvoices > 3) {
        recommendations.push(
          "Accelerate customer payment collections."
        );
      }

      if (paidRevenue < totalRevenue * 0.5) {
        recommendations.push(
          "Revenue realization efficiency is low."
        );
      }

      if (overdueRentals > 0) {
        recommendations.push(
          "Deploy rental recovery follow-ups."
        );
      }

      if (overdueServices > 0) {
        recommendations.push(
          "Increase workforce allocation for delayed services."
        );
      }

      setAutonomousRecommendations(
        recommendations
      );

      const anomalies: string[] = [];

      if (anomalyScore >= 50) {
        anomalies.push(
          "Critical operational instability detected."
        );
      }

      if (unpaidInvoices > 5) {
        anomalies.push(
          "Abnormally high unpaid invoice volume."
        );
      }

      if (pendingDue > 150000) {
        anomalies.push(
          "Collections pressure entering risk zone."
        );
      }

      if (overdueServices > 1) {
        anomalies.push(
          "Service execution congestion increasing."
        );
      }

      setAnomalySignals(anomalies);

      const forecasts: string[] = [];

      if (forecastPressure === "High") {
        forecasts.push(
          "Operational workload escalation likely."
        );

        forecasts.push(
          "Revenue realization slowdown predicted."
        );
      }

      if (forecastPressure === "Moderate") {
        forecasts.push(
          "ERP recovery actions recommended soon."
        );
      }

      if (!forecasts.length) {
        forecasts.push(
          "Operational forecasting remains stable."
        );
      }

      setForecastSignals(forecasts);

      const workloads: string[] = [];

      if (stats.serviceCount > 10) {
        workloads.push(
          "Service workforce balancing recommended."
        );
      }

      if (stats.rentalCount > 15) {
        workloads.push(
          "Rental dispatch workload increasing."
        );
      }

      if (!workloads.length) {
        workloads.push(
          "Operational workload distribution stable."
        );
      }

      setWorkloadSignals(workloads);

      const recoveries: string[] = [];

      if (pendingDue > 100000) {
        recoveries.push(
          "Launch high-priority collection recovery cycle."
        );
      }

      if (overdueServices > 0) {
        recoveries.push(
          "Escalate delayed service execution."
        );
      }

      if (unpaidInvoices > 5) {
        recoveries.push(
          "Focus financial recovery on pending invoices."
        );
      }

      if (!recoveries.length) {
        recoveries.push(
          "Recovery operations currently stable."
        );
      }

      setRecoveryActions(recoveries);



      const calculatedThroughputScore =
        executionVelocity === "Fast"
          ? 90
          : executionVelocity === "Moderate"
          ? 65
          : 40;

      setThroughputScore(calculatedThroughputScore);

      const profitabilityForecastSignal =
        collectionEfficiency >= 80
          ? "Strong"
          : collectionEfficiency >= 60
          ? "Moderate"
          : "Risk";

      setProfitabilityForecast(
        profitabilityForecastSignal
      );

      const throughputs: string[] = [];

      if (executionVelocity === "Fast") {
        throughputs.push(
          "Workflow throughput operating efficiently."
        );
      }

      if (executionVelocity === "Moderate") {
        throughputs.push(
          "Execution throughput requires monitoring."
        );
      }

      if (executionVelocity === "Slow") {
        throughputs.push(
          "Operational throughput degradation detected."
        );
      }

      setThroughputSignals(throughputs);

      const compressedSignals = [
        ...alerts,
        ...priorities,
        ...recommendations,
      ].slice(0, 5);

      setCollapsedSignals(compressedSignals);



      const calculatedMomentumScore =
        executionVelocity === "Fast"
          ? 92
          : executionVelocity === "Moderate"
          ? 68
          : 42;

      setMomentumScore(calculatedMomentumScore);

      const momentum: string[] = [];

      if (throughputScore >= 85) {
        momentum.push(
          "Operational momentum progressing strongly."
        );
      }

      if (throughputScore >= 60 && throughputScore < 85) {
        momentum.push(
          "Execution momentum stable with monitoring."
        );
      }

      if (throughputScore < 60) {
        momentum.push(
          "Execution momentum degradation detected."
        );
      }

      setMomentumSignals(momentum);

      const orchestration: string[] = [];

      if (pendingDue > 100000) {
        orchestration.push(
          "Prioritize collections recovery operations."
        );
      }

      if (executionVelocity === "Slow") {
        orchestration.push(
          "Redistribute operational workload immediately."
        );
      }

      if (forecastPressure === "High") {
        orchestration.push(
          "Activate operational stabilization workflows."
        );
      }

      if (!orchestration.length) {
        orchestration.push(
          "Operational orchestration remains stable."
        );
      }

      setOrchestrationSignals(orchestration);

      const clustered = [
        ...alerts,
        ...priorities,
        ...anomalies,
        ...recoveries,
        ...orchestration,
      ].slice(0, 8);

      setClusterSignals(clustered);

      const automation: string[] = [];

      if (pendingDue > 100000) {
        automation.push(
          "Auto-prioritize collections recovery workflows."
        );
      }

      if (overdueServices > 1) {
        automation.push(
          "Increase workforce allocation automatically."
        );
      }

      if (overdueRentals > 1) {
        automation.push(
          "Trigger rental recovery automation."
        );
      }

      if (!automation.length) {
        automation.push(
          "Operational automation remains stable."
        );
      }

      setAutomationSignals(automation);

      const stabilization: string[] = [];

      if (forecastPressure === "High") {
        stabilization.push(
          "Deploy operational stabilization mode."
        );
      }

      if (anomalyScore >= 50) {
        stabilization.push(
          "Activate executive recovery escalation."
        );
      }

      if (executionVelocity === "Slow") {
        stabilization.push(
          "Protect execution continuity immediately."
        );
      }

      if (!stabilization.length) {
        stabilization.push(
          "Operational stability maintained."
        );
      }

      setStabilizationSignals(stabilization);







      const summary =
        "ERP maturity at " +
        Math.round(erpMaturityScore) +
        "% with " +
        executionVelocity +
        " execution velocity and " +
        profitabilitySignal.toLowerCase() +
        " profitability stability.";

      setExecutiveSummary(summary);












            setLiveEvents(eventsRes.data || []);
    }

    loadWorkspace();
  }, [supabase]);
  return (
    <main className="overflow-x-hidden min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl overflow-x-hidden flex-col gap-4 px-3 py-4 md:px-6">

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-col sm:flex-row md:items-center md:justify-between">

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Vendor ERP Workspace
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Unified operational workspace connecting inventory,
                billing, rental ERP, service ERP, procurement and finance.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Powered by 3Bigha ERP OS
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Inventory Items", String(stats.inventoryCount)],
            ["Pending Dues", `₹${stats.pendingDue.toLocaleString()}`],
            ["Rental Bookings", String(stats.rentalCount)],
            ["Service Jobs", String(stats.serviceCount)],
            ["RFQs Awaiting", String(stats.rfqCount)],
            ["Dispatch Today", String(stats.dispatchCount)],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {title}
              </p>

              <p className="mt-3 text-xl font-bold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </section>




        <section className="rounded-[1.75rem] border border-slate-900 bg-slate-950 p-4 shadow-xl">

          <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-3">

            <div>
              <h2 className="text-xl font-black text-white">
                Executive Command Cluster
              </h2>

              <p className="mt-1 text-sm text-slate-300">
                Unified operational cognition, orchestration and automation layer.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
              Adaptive Executive OS · Mobile Optimized
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-2xl bg-white/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                ERP
              </p>

              <div className="mt-2 text-xl font-black text-white">
                {Math.round(stats.erpMaturityScore)}%
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Momentum
              </p>

              <div className="mt-2 text-xl font-black text-white">
                {momentumScore}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Throughput
              </p>

              <div className="mt-2 text-xl font-black text-white">
                {throughputScore}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Forecast
              </p>

              <div className="mt-2 text-xl font-black text-white">
                {stats.forecastPressure}
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 p-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                Health
              </p>

              <div className="mt-2 text-xl font-black text-white">
                {stats.healthScore}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            {compactExecutiveSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-2xl bg-white/10 px-3 py-2 text-[13px] font-semibold text-slate-100"
              >
                {signal}
              </div>
            ))}
          </div>
        </section>




        <section className="grid gap-3 sm:grid-cols-2 lg:sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Total ERP Revenue
            </p>

            <div className="mt-3 text-xl font-black text-emerald-900">
              ₹{stats.totalRevenue.toLocaleString()}
            </div>

            <p className="mt-3 text-sm text-emerald-700">
              Combined billing revenue across ERP operations.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
              Realized Revenue
            </p>

            <div className="mt-3 text-xl font-black text-cyan-900">
              ₹{stats.paidRevenue.toLocaleString()}
            </div>

            <p className="mt-3 text-sm text-cyan-700">
              Successfully collected customer payments.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-orange-200 bg-orange-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
              Unpaid Invoices
            </p>

            <div className="mt-3 text-xl font-black text-orange-900">
              {stats.unpaidInvoices}
            </div>

            <p className="mt-3 text-sm text-orange-700">
              Financial continuity risk indicator.
            </p>
          </div>
        </section>


        <section className="grid gap-3 lg:sm:grid-cols-2 lg:grid-cols-3">
          {workspaceModules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {module.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {module.description}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  ERP
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {module.metrics.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-slate-50 p-3"
                  >
                    <p className="text-xs font-medium text-slate-500">
                      {label}
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </section>




        <section className="grid gap-3 sm:grid-cols-2 lg:sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-[1.75rem] border border-indigo-200 bg-indigo-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
              Throughput Score
            </p>

            <div className="mt-3 text-xl font-black text-indigo-900">
              {throughputScore}
            </div>

            <p className="mt-3 text-sm text-indigo-700">
              Unified operational execution throughput score.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Profitability Forecast
            </p>

            <div className="mt-3 text-xl font-black text-emerald-900">
              {profitabilityForecast}
            </div>

            <p className="mt-3 text-sm text-emerald-700">
              Predicted operational profitability stability.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-cyan-200 bg-cyan-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
              Orchestration Status
            </p>

            <div className="mt-3 text-xl font-black text-cyan-900">
              {stats.forecastPressure}
            </div>

            <p className="mt-3 text-sm text-cyan-700">
              Adaptive operational orchestration pressure.
            </p>
          </div>
        </section>


        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Adaptive Executive Cognition
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  AI-compressed operational intelligence for executive readability.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                Adaptive Cognition
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {collapsedSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-blue-950">
                  Throughput Analytics
                </h2>

                <p className="mt-2 text-sm text-blue-800">
                  Workflow execution momentum and operational throughput analysis.
                </p>
              </div>

              <span className="rounded-full bg-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-900">
                Throughput AI
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {throughputSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-blue-200 bg-white px-3 py-2 text-[13px] font-semibold text-blue-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </section>




        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">

          <div className="rounded-[1.75rem] border border-slate-300 bg-white p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-4">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Executive Orchestration Cluster
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  AI-clustered operational cognition for executive readability.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                Cognition Cluster
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {clusterSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-violet-950">
                  Execution Momentum Engine
                </h2>

                <p className="mt-2 text-sm text-violet-800">
                  Operational acceleration and recovery progression analytics.
                </p>
              </div>

              <span className="rounded-full bg-violet-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-900">
                Momentum AI
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {momentumSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-violet-200 bg-white px-3 py-2 text-[13px] font-semibold text-violet-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </section>



        <section className="grid gap-3 sm:grid-cols-2 lg:sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-[1.75rem] border border-fuchsia-200 bg-fuchsia-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-700">
              Momentum Score
            </p>

            <div className="mt-3 text-xl font-black text-fuchsia-900">
              {momentumScore}
            </div>

            <p className="mt-3 text-sm text-fuchsia-700">
              Unified operational momentum intelligence score.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
              Automation Layer
            </p>

            <div className="mt-3 text-xl font-black text-rose-900">
              Active
            </div>

            <p className="mt-3 text-sm text-rose-700">
              Adaptive operational automation coordination.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-lime-200 bg-lime-50 p-4 shadow-sm">

            <p className="text-xs font-bold uppercase tracking-wide text-lime-700">
              Stabilization Status
            </p>

            <div className="mt-3 text-xl font-black text-lime-900">
              {stats.forecastPressure}
            </div>

            <p className="mt-3 text-sm text-lime-700">
              Adaptive ERP continuity stabilization pressure.
            </p>
          </div>
        </section>


        <section className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-4 shadow-sm">

          <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-4">

            <div>
              <h2 className="text-xl font-bold text-sky-950">
                Executive Orchestration Engine
              </h2>

              <p className="mt-2 text-sm text-sky-800">
                Adaptive operational stabilization and workload coordination layer.
              </p>
            </div>

            <span className="rounded-full bg-sky-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-900">
              Orchestration AI
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {orchestrationSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-2xl border border-sky-200 bg-white px-3 py-2 text-[13px] font-semibold text-sky-900"
              >
                {signal}
              </div>
            ))}
          </div>
        </section>



        <section className="grid gap-4 lg:grid-cols-2">

          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-4">

              <div>
                <h2 className="text-xl font-bold text-emerald-950">
                  Operational Automation Engine
                </h2>

                <p className="mt-2 text-sm text-emerald-800">
                  AI-assisted workload redistribution and execution automation.
                </p>
              </div>

              <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-900">
                Automation AI
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {automationSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-[13px] font-semibold text-emerald-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between flex-wrap gap-4">

              <div>
                <h2 className="text-xl font-bold text-red-950">
                  Stabilization Engine
                </h2>

                <p className="mt-2 text-sm text-red-800">
                  Adaptive operational continuity and stabilization workflows.
                </p>
              </div>

              <span className="rounded-full bg-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-900">
                Stabilization AI
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {stabilizationSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-[13px] font-semibold text-red-900"
                >
                  {signal}
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">

          <div className="flex gap-2 sm:items-center sm:justify-between">

            <div>
              <h2 className="text-xl font-bold text-amber-950">
                Executive Attention Center
              </h2>

              <p className="mt-2 text-sm text-amber-800">
                Operational alerts requiring immediate vendor attention.
              </p>
            </div>

            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
              Live ERP Intelligence
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {(executiveAlerts.length
              ? executiveAlerts
              : [
                  "Operations stable across ERP systems.",
                ]).map((alert) => (
              <div
                key={alert}
                className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-[13px] font-semibold text-amber-900"
              >
                {alert}
              </div>
            ))}
          </div>
        </section>







        <section className="grid gap-3 lg:sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Operational Health Score
            </p>

            <div className="mt-3 text-xl font-black text-slate-900">
              {stats.healthScore}
            </div>

            <p className="mt-3 text-sm text-slate-600">
              ERP continuity and execution stability indicator.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
              Overdue Rentals
            </p>

            <div className="mt-3 text-xl font-black text-rose-900">
              {stats.overdueRentals}
            </div>

            <p className="mt-3 text-sm text-rose-700">
              Rental lifecycle interruptions detected.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
              Overdue Services
            </p>

            <div className="mt-3 text-xl font-black text-violet-900">
              {stats.overdueServices}
            </div>

            <p className="mt-3 text-sm text-violet-700">
              Service execution delays requiring action.
            </p>
          </div>
        </section>




        <section className="grid gap-4 md:grid-cols-2">

          <div className="rounded-[1.75rem] border border-teal-200 bg-teal-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-teal-950">
                  Executive Business Intelligence
                </h2>

                <p className="mt-2 text-sm text-teal-800">
                  ERP financial efficiency and operational maturity analysis.
                </p>
              </div>

              <span className="rounded-full bg-teal-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-900">
                Executive BI
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <div className="rounded-2xl border border-teal-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Collection Efficiency
                </p>

                <div className="mt-3 text-xl font-black text-teal-900">
                  {stats.collectionEfficiency}%
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  Revenue Stability
                </p>

                <div className="mt-3 text-xl font-black text-teal-900">
                  {stats.healthScore}%
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {workloadSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-teal-200 bg-white px-3 py-2 text-[13px] font-semibold text-teal-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-lime-200 bg-lime-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-lime-950">
                  Recovery Orchestration Engine
                </h2>

                <p className="mt-2 text-sm text-lime-800">
                  AI-assisted operational recovery coordination layer.
                </p>
              </div>

              <span className="rounded-full bg-lime-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-lime-900">
                Recovery AI
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {recoveryActions.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-lime-200 bg-white px-3 py-2 text-[13px] font-semibold text-lime-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="grid gap-4 md:grid-cols-2">

          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-rose-950">
                  Operational Anomaly Engine
                </h2>

                <p className="mt-2 text-sm text-rose-800">
                  Predictive operational instability detection.
                </p>
              </div>

              <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-900">
                Anomaly AI
              </span>
            </div>

            <div className="mt-6">
              <div className="text-xl font-black text-rose-900">
                {stats.anomalyScore}
              </div>

              <p className="mt-2 text-sm font-semibold text-rose-700">
                Composite operational anomaly score.
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {(anomalySignals.length
                ? anomalySignals
                : [
                    "No abnormal operational patterns detected.",
                  ]).map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-[13px] font-semibold text-rose-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-indigo-200 bg-indigo-50 p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-indigo-950">
                  Forecasting Engine
                </h2>

                <p className="mt-2 text-sm text-indigo-800">
                  Predictive ERP workload and recovery forecasting.
                </p>
              </div>

              <span className="rounded-full bg-indigo-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-900">
                Forecast AI
              </span>
            </div>

            <div className="mt-6">
              <div className="text-xl font-black text-indigo-900">
                {stats.forecastPressure}
              </div>

              <p className="mt-2 text-sm font-semibold text-indigo-700">
                Forecasted operational pressure level.
              </p>
            </div>

            <div className="mt-4 grid gap-2">
              {forecastSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-[13px] font-semibold text-indigo-900"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="rounded-[1.75rem] border border-fuchsia-200 bg-fuchsia-50 p-4 shadow-sm">

          <div className="flex gap-2 sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-fuchsia-950">
                Autonomous Operational Recommendations
              </h2>

              <p className="mt-2 text-sm text-fuchsia-800">
                AI-assisted ERP operational optimization guidance.
              </p>
            </div>

            <span className="rounded-full bg-fuchsia-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-fuchsia-900">
              Autonomous Intelligence
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {(autonomousRecommendations.length
              ? autonomousRecommendations
              : [
                  "Operational efficiency remains stable.",
                ]).map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-fuchsia-200 bg-white px-3 py-2 text-[13px] font-semibold text-fuchsia-900"
              >
                {item}
              </div>
            ))}
          </div>
        </section>


        <section className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">

          <div className="flex gap-2 sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-950">
                Executive Priority Engine
              </h2>

              <p className="mt-2 text-sm text-blue-800">
                AI-assisted operational prioritization layer.
              </p>
            </div>

            <span className="rounded-full bg-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-900">
              ERP Cognition
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {(priorityActions.length
              ? priorityActions
              : [
                  "No operational bottlenecks detected.",
                ]).map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-blue-200 bg-white px-3 py-2 text-[13px] font-semibold text-blue-900"
              >
                {item}
              </div>
            ))}
          </div>
        </section>


        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex gap-2 sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Operational Event Stream
              </h2>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Unified Operational Timeline
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {(liveEvents.length ? liveEvents : operationalFeed).map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-4">

                    <div>
                      <p className="font-semibold text-slate-900">
                        {event.title || event.event_type || "Operational Event"}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {event.message || event.description || "ERP operational activity detected"}
                      </p>

                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {(event.type || event.module || "erp")}
                      </p>
                    </div>

                    <span className="text-xs text-slate-400">
                      {event.time || "Live"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex gap-2 sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Executive Operations
                </h2>

                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  OPERATIONS
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    href={action.href}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {action.title}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">

              <div className="flex gap-2 sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  AI Operational Copilot
                </h2>

                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                  AI
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  "2 invoices pending collection",
                  "Cement stock approaching reorder level",
                  "1 rental return expected today",
                  "Electrical service workload increasing",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

          </div>
        </section>
      </div>
    </main>
  );
}

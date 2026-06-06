"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import LiveProcurementRefreshBadge from "@/app/components/procurement/LiveProcurementRefreshBadge";
import ProcurementLiveTicker from "@/app/components/procurement/ProcurementLiveTicker";
import ProcurementHeatmapIntelligence from "@/app/components/procurement/ProcurementHeatmapIntelligence";
import { createClient } from "@supabase/supabase-js";
import GlobalAiOperationalStatus from "@/components/ai-operational/GlobalAiOperationalStatus";
import OperationalRecoveryFeed from "@/components/ai-operational/OperationalRecoveryFeed";
import ProcurementDecayBadge from "@/components/procurement/intelligence/ProcurementDecayBadge";

import {
  evaluateExecutiveCognitiveState,
  getExecutiveCognitiveLabel,
  sequenceExecutiveSignals,
  batchLowValueInterruptions,
} from "@/lib/procurement/intelligence/executive-cognitive-os";

import { normalizeOperationalUrgency } from "@/lib/procurement-live/procurementLiveAdapters";
import {
calculateOperationalAttentionPriority,
  sortByOperationalAttention,
} from "@/lib/procurement/intelligence/operational-priority";
import {
  createSharedFocusState,
  routeUnifiedInterruptions,
  resolveCalmExecutionNetwork,
} from "@/lib/procurement/intelligence/executive-attention-fabric";
import {
  evaluateProcurementStabilityIndex,
  forecastExecutiveOverload,
} from "@/lib/procurement/intelligence/strategic-executive-intelligence";
import {
  buildOperationalMemoryEntries,
  evaluateOperationalMemoryHealth,
  preserveContinuityContext,
  evaluateSequencingHistory,
  evaluateRecoveryEffectivenessMemory,
} from "@/lib/procurement/intelligence/operational-memory-fabric";
import {
  evaluateSupervisedOperationalAssistance,
  draftSupervisedOperationalAction,
  generateContinuitySafeAction,
  recommendRecoveryPacing,
} from "@/lib/procurement/intelligence/autonomous-operational-assistance";
import {
  evaluateOperationalTrustIntelligence,
  evaluateExecutionReliability,
  evaluateWorkflowPredictability,
  evaluateRecoveryConsistency,
} from "@/lib/procurement/intelligence/operational-trust-intelligence";
import {
  evaluateProcurementMissionGrid,
  resolveUnifiedMissionState,
  evaluateCrossModuleSequencing,
  coordinateMissionRecovery,
} from "@/lib/procurement/intelligence/procurement-mission-intelligence-grid";
import {
  evaluateAdaptiveProcurementCoordinationNetwork,
  evaluateWorkloadHarmonization,
  evaluateContinuityLoadBalancing,
  redistributeOperationalPressure,
} from "@/lib/procurement/intelligence/adaptive-procurement-coordination-network";
import {
  evaluateProcurementContinuityNervousSystem,
  evaluateContinuityPulse,
  evaluateOperationalReflex,
  evaluateContinuityAnomalyReflex,
} from "@/lib/procurement/intelligence/procurement-continuity-nervous-system";
import {
  evaluateProcurementCognitiveExecutionMesh,
  evaluateExecutionPropagation,
  evaluateContinuityLinkedExecution,
  evaluateAdaptiveExecutionTiming,
} from "@/lib/procurement/intelligence/procurement-cognitive-execution-mesh";
import {
  evaluateRecoveryForecastIntelligence,
  resolveOperationalRecoveryMesh,
  forecastContinuityRisk,
} from "@/lib/procurement/intelligence/recovery-forecast-intelligence";
import ExecutiveIntelligenceCollapse from "@/components/procurement/ExecutiveIntelligenceCollapse";
import {
  evaluateSituationalCollaborationIntelligence,
  resolveProcurementSituationalAwareness,
  resolveHumanCollaborationGuidance,
} from "@/lib/procurement/intelligence/situational-collaboration-intelligence";
import {
  evaluateProcurementOsStabilization,
  simulateExecutionResilience,
  resolveSupervisedAutomationReadiness,
  resolveUnifiedProcurementOsHealth,
} from "@/lib/procurement/intelligence/procurement-os-stabilization";

type LiveEvent = {
  id: string;
  title: string;
  description?: string;
  module?: string;
  eventType?: string;
  priority?: "critical" | "high" | "medium" | "low";
  tone?: "critical" | "high" | "medium" | "active" | "closed";
  score?: number;
  signal?: string;
  action?: string;
  href?: string;
  updated_at?: string;
  createdAt?: string;
};

function toneClass(tone?: string) {
  if (tone === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "high") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "medium") return "border-blue-200 bg-blue-50 text-blue-800";
  if (tone === "closed") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function fmt(v?: string) {
  if (!v) return "â€”";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  } catch {
    return v;
  }
}

export default function ProcurementLivePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [data, setData] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [cognition, setCognition] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [showOps, setShowOps] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTelemetryStats, setShowTelemetryStats] = useState(false);
  const [compactEvents, setCompactEvents] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = () => {
      Promise.all([
        fetch("/api/ai/procurement-live-events").then((r) => r.json()),
        fetch("/api/ai/procurement-telemetry").then((r) => r.json()),
        fetch("/api/ai/procurement-unified-cognition").then((r) => r.json()),
      ])
        .then(([liveJson, telemetryJson]) => {
          if (!mounted) return;

          setData(liveJson);
          setTelemetry(telemetryJson);
        })
        .catch(() => {
          if (mounted) setData({ ok: false });
        });
    };

    load();

        const realtime = supabase
      .channel("procurement-live-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_messages",
        },
        () => {
          load();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_memory_events",
        },
        () => {
          load();
        }
      )
      .subscribe();

    const timer = window.setInterval(load, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);

      supabase.removeChannel(realtime);
    };
  }, []);

  const events: LiveEvent[] = Array.isArray(data?.events) ? data.events : [];

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;

    return events.filter(
      (event) =>
        event.tone === filter ||
        event.priority === filter ||
        event.module === filter ||
        event.eventType === filter
    );
  }, [events, filter]);

  function eventAttention(event: LiveEvent) {
    const activityAt = event.updated_at || event.createdAt;
    const activityAgeHours = activityAt
      ? Math.max(
          0,
          Math.round((Date.now() - new Date(activityAt).getTime()) / 3600000)
        )
      : 999;

    const tone = event.priority || event.tone || "active";

    const urgency =
      tone === "critical"
        ? 20
        : tone === "high"
          ? 14
          : tone === "medium"
            ? 8
            : tone === "low"
              ? 3
              : 5;

    const operationalRisk =
      tone === "critical"
        ? 15
        : tone === "high"
          ? 10
          : tone === "medium"
            ? 5
            : 0;

    return calculateOperationalAttentionPriority({
      decay: {
        workflowAgeHours: activityAgeHours,
        hoursSinceLastActivity: activityAgeHours,
        quoteCount: Number(event.score || 0) > 0 ? 1 : 0,
      },
      momentum: {
        recentActivityCount: activityAgeHours <= 12 ? 3 : 0,
        quoteGrowth: Number(event.score || 0) > 0 ? 1 : 0,
      },
      urgency,
      operationalRisk,
      workflowHealth:
        tone === "critical"
          ? 25
          : tone === "high"
            ? 45
            : tone === "medium"
              ? 65
              : 85,
      aiConfidence: Math.min(100, Number(event.score || 0)),
      escalationSignals:
        tone === "critical" ? 2 : tone === "high" ? 1 : 0,
    });
  }

  const sortedEvents = sortByOperationalAttention(
    filteredEvents,
    eventAttention
  );

  const priorityEvents = sortedEvents.filter((event) =>
    ["critical", "high"].includes(event.priority || event.tone || "")
  );

  const normalEvents = sortedEvents.filter(
    (event) => !["critical", "high"].includes(event.priority || event.tone || "")
  );

  const visibleEvents = compactEvents
    ? [...priorityEvents, ...normalEvents.slice(0, 8)]
    : sortedEvents;

  const hiddenNormalCount = compactEvents
    ? Math.max(0, normalEvents.length - 8)
    : 0;

  const executiveSignals = sortedEvents.slice(0, 24).map((event, index) => ({
    id: String(event.id || index),
    source: "procurement_live" as const,
    title: event.title || "Live procurement event",
    detail: event.description || event.signal,
    severity:
      (event.priority || event.tone) === "critical"
        ? ("critical" as const)
        : (event.priority || event.tone) === "high"
          ? ("actionable" as const)
          : (event.priority || event.tone) === "medium"
            ? ("watch" as const)
            : ("passive" as const),
    workflowId:
      (event as any).workflowId ||
      (event as any).rfqId ||
      event.module ||
      `live-${index}`,
  }));

  const executiveCognitiveState =
    evaluateExecutiveCognitiveState(executiveSignals);

  const sequencedExecutiveSignals =
    sequenceExecutiveSignals(executiveSignals);

  const interruptionBatching =
    batchLowValueInterruptions(sequencedExecutiveSignals);

  const calmPriorityCount =
    interruptionBatching.priority.length;

  const compressedSignalCount =
    interruptionBatching.batched.length;

  const sharedFocusState = createSharedFocusState(
    "procurement_live",
    executiveSignals,
    executiveCognitiveState
  );

  const unifiedInterruptions =
    routeUnifiedInterruptions(executiveSignals);

  const calmExecutionNetwork =
    resolveCalmExecutionNetwork(sharedFocusState);

  const procurementStability =
    evaluateProcurementStabilityIndex(executiveCognitiveState);

  const overloadForecast =
    forecastExecutiveOverload(procurementStability);

  const operationalMemoryEntries =
    buildOperationalMemoryEntries(executiveSignals);

  const operationalMemoryHealth =
    evaluateOperationalMemoryHealth(operationalMemoryEntries);

  const continuityPersistence =
    preserveContinuityContext(operationalMemoryEntries);

  const sequencingHistory =
    evaluateSequencingHistory(operationalMemoryEntries);

  const recoveryMemory =
    evaluateRecoveryEffectivenessMemory(operationalMemoryEntries);

  const supervisedAssistance =
    evaluateSupervisedOperationalAssistance({
      consciousness: {
        unifiedMissionCoherence: procurementStability.overallStability,
        globalOperationalRhythm: executiveCognitiveState.operationalRhythmStability,
        synchronizedContinuityStability: executiveCognitiveState.continuityIntegrity,
        executiveContextSynchronization: executiveCognitiveState.focusResilience,
        calmNetworkHealth: procurementStability.calmSustainability,
        sequencingCoordinationIntegrity: executiveCognitiveState.sequencingEfficiency,
        operationalConsciousnessStability: procurementStability.overallStability,
        consciousnessMode:
          overloadForecast.probability === "high"
            ? "recovery_sync"
            : executiveCognitiveState.calmModeRecommended
              ? "guided"
              : "stable",
        explanation: procurementStability.explanation[0],
      },
      learning: {
        operationalLearningConfidence: operationalMemoryHealth.operationalMemoryConfidence,
        continuityOptimizationScore: operationalMemoryHealth.continuityPersistenceHealth,
        calmExecutionImprovement: executiveCognitiveState.operationalRhythmStability,
        missionStabilityLearningHealth: procurementStability.overallStability,
        recommendation:
          executiveCognitiveState.calmModeRecommended
            ? "increase_sequence_protection"
            : "continue_current_rhythm",
        explanation: operationalMemoryHealth.explanation[0],
      },
      memory: operationalMemoryHealth,
    });

  const supervisedActionDraft =
    draftSupervisedOperationalAction(supervisedAssistance);

  const continuitySafeAction =
    generateContinuitySafeAction(supervisedAssistance);

  const recoveryPacing =
    recommendRecoveryPacing(supervisedAssistance);

  const operationalTrust =
    evaluateOperationalTrustIntelligence({
      assistance: supervisedAssistance,
      consciousness: {
        unifiedMissionCoherence: procurementStability.overallStability,
        globalOperationalRhythm: executiveCognitiveState.operationalRhythmStability,
        synchronizedContinuityStability: executiveCognitiveState.continuityIntegrity,
        executiveContextSynchronization: executiveCognitiveState.focusResilience,
        calmNetworkHealth: procurementStability.calmSustainability,
        sequencingCoordinationIntegrity: executiveCognitiveState.sequencingEfficiency,
        operationalConsciousnessStability: procurementStability.overallStability,
        consciousnessMode:
          overloadForecast.probability === "high"
            ? "recovery_sync"
            : executiveCognitiveState.calmModeRecommended
              ? "guided"
              : "stable",
        explanation: procurementStability.explanation[0],
      },
      stability: procurementStability,
    });

  const executionReliability =
    evaluateExecutionReliability(operationalTrust);

  const workflowPredictability =
    evaluateWorkflowPredictability(operationalTrust);

  const recoveryConsistency =
    evaluateRecoveryConsistency(operationalTrust);

  const missionGrid =
    evaluateProcurementMissionGrid({
      trust: operationalTrust,
      consciousness: {
        unifiedMissionCoherence: procurementStability.overallStability,
        globalOperationalRhythm: executiveCognitiveState.operationalRhythmStability,
        synchronizedContinuityStability: executiveCognitiveState.continuityIntegrity,
        executiveContextSynchronization: executiveCognitiveState.focusResilience,
        calmNetworkHealth: procurementStability.calmSustainability,
        sequencingCoordinationIntegrity: executiveCognitiveState.sequencingEfficiency,
        operationalConsciousnessStability: procurementStability.overallStability,
        consciousnessMode:
          overloadForecast.probability === "high"
            ? "recovery_sync"
            : executiveCognitiveState.calmModeRecommended
              ? "guided"
              : "stable",
        explanation: procurementStability.explanation[0],
      },
      assistance: supervisedAssistance,
    });

  const unifiedMissionState =
    resolveUnifiedMissionState(missionGrid);

  const crossModuleSequencing =
    evaluateCrossModuleSequencing(missionGrid);

  const missionRecovery =
    coordinateMissionRecovery(missionGrid);

  const coordinationNetwork =
    evaluateAdaptiveProcurementCoordinationNetwork({
      missionGrid,
      trust: operationalTrust,
      assistance: supervisedAssistance,
    });

  const workloadHarmonization =
    evaluateWorkloadHarmonization(coordinationNetwork);

  const continuityLoadBalancing =
    evaluateContinuityLoadBalancing(coordinationNetwork);

  const pressureRedistribution =
    redistributeOperationalPressure(coordinationNetwork);

  const procurementCognitiveMesh =
    evaluateProcurementCognitiveExecutionMesh({
      coordination: coordinationNetwork,
      missionGrid,
      memory: operationalMemoryHealth,
    });

  const executionPropagation =
    evaluateExecutionPropagation(procurementCognitiveMesh);

  const continuityLinkedExecution =
    evaluateContinuityLinkedExecution(procurementCognitiveMesh);

  const adaptiveExecutionTiming =
    evaluateAdaptiveExecutionTiming(procurementCognitiveMesh);

  const procurementNervousSystem =
    evaluateProcurementContinuityNervousSystem({
      mesh: procurementCognitiveMesh,
      coordination: coordinationNetwork,
      missionGrid,
    });

  const continuityPulse =
    evaluateContinuityPulse(procurementNervousSystem);

  const operationalReflex =
    evaluateOperationalReflex(procurementNervousSystem);

  const continuityAnomalyReflex =
    evaluateContinuityAnomalyReflex(procurementNervousSystem);

  const recoveryForecast =
    evaluateRecoveryForecastIntelligence({
      nervousSystem: procurementNervousSystem,
      mesh: procurementCognitiveMesh,
      trust: operationalTrust,
    });

  const operationalRecoveryMesh =
    resolveOperationalRecoveryMesh(recoveryForecast);

  const continuityForecast =
    forecastContinuityRisk(recoveryForecast);

  const situationalCollaboration =
    evaluateSituationalCollaborationIntelligence({
      recoveryForecast,
      missionGrid,
      trust: operationalTrust,
    });

  const situationalAwareness =
    resolveProcurementSituationalAwareness(situationalCollaboration);

  const humanCollaboration =
    resolveHumanCollaborationGuidance(situationalCollaboration);

  const procurementOsStabilization =
    evaluateProcurementOsStabilization({
      collaboration: situationalCollaboration,
      recoveryForecast,
      nervousSystem: procurementNervousSystem,
    });

  const executionResilience =
    simulateExecutionResilience(procurementOsStabilization);

  const supervisedAutomation =
    resolveSupervisedAutomationReadiness(procurementOsStabilization);

  const unifiedOsHealth =
    resolveUnifiedProcurementOsHealth(procurementOsStabilization);

  const summary = data?.summary || {};

  return (
    <main className="min-h-screen bg-[#f6f7fb] p-6">
      <div className="mx-auto max-w-7xl">
        <CompressionZone
          title="Operational intelligence"
          subtitle="AI status and recovery feed"
          open={showOps}
          onToggle={() => setShowOps((v) => !v)}
        >
          <div className="space-y-4">
            <GlobalAiOperationalStatus
              battlefieldPulse="active"
              procurementPressure="attention"
              economicStress="watch"
              supplyChainRisk="stable"
              orchestrationState="loaded"
            />

            <OperationalRecoveryFeed />
          </div>
        </CompressionZone>
        <div className="overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-cyan-950 to-emerald-950 p-10 text-white shadow-2xl">
          <div className="inline-flex rounded-full border border-white/10 bg-white/10 px-5 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Live Procurement Event Feed
          </div>

          <h1 className="mt-6 text-5xl font-black">
            Procurement Live Situation Flow
          </h1>

          <p className="mt-4 max-w-3xl text-base font-medium text-slate-200">
            Live RFQ, chat, memory, listing-view, recommendation-click and
            procurement-risk signals flowing into one operational command stream.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm font-bold text-slate-100">
            {data?.executiveSignal || "Loading live procurement intelligence..."}
          </div>

          <div className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-6 py-4 text-sm font-bold text-cyan-100">
            Realtime AI procurement telemetry stream connected to Supabase event infrastructure.
          </div>

          {data?.feedHealth ? (
            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-6 py-4 text-sm font-bold text-emerald-100">
              Feed Health: {data.feedHealth}
            </div>
          ) : null}
        </div>

        <div className="mt-8">
          <ProcurementCommandCenterNav />
        </div>


        <div className={`mt-6 rounded-[1.5rem] border p-5 shadow-sm ${
          cognition?.cognition?.predictiveRisk === "critical"
            ? "border-rose-200 bg-rose-50 text-rose-900"
            : cognition?.cognition?.predictiveRisk === "high"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : cognition?.cognition?.predictiveRisk === "elevated"
                ? "border-blue-200 bg-blue-50 text-blue-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em]">
                Live Predictive Cognition
              </div>

              <div className="mt-2 text-2xl font-black">
                {(cognition?.cognition?.trajectory || "stable")} · {(cognition?.cognition?.predictiveRisk || "low")}
              </div>

              <div className="mt-2 text-sm font-bold leading-6">
                {cognition?.executiveSummary ||
                  "Live procurement cognition remains stable."}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-2xl border border-white/40 bg-white/50 px-4 py-2 text-xs font-black">
                Cognition {cognition?.cognition?.cognitionScore || 0}
              </span>

              <span className="rounded-2xl border border-white/40 bg-white/50 px-4 py-2 text-xs font-black">
                Drift {cognition?.cognition?.operationalDrift || 0}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {cognition?.cognition?.silentRiskDetected ? (
              <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                Silent weakening detected
              </span>
            ) : null}

            {cognition?.cognition?.escalationLikely ? (
              <span className="rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                Escalation pressure rising
              </span>
            ) : null}

            {cognition?.cognition?.recoveryLikely ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                Recovery likely
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-sm font-black">
            {cognition?.nextBestAction ||
              "Continue live procurement monitoring."}
          </div>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-blue-100 bg-blue-50/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Executive Cognitive Orchestration
              </div>

              <div className="mt-2 text-2xl font-black text-slate-950">
                {getExecutiveCognitiveLabel(executiveCognitiveState)}
              </div>
              <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-black text-blue-700">
                {calmExecutionNetwork.visibleLabel}
              </div>

              <div className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                <ExecutiveIntelligenceCollapse
  title="Executive Intelligence"
  preview={executiveCognitiveState.explanation[0]}
>
  <div className="text-sm text-slate-700 proc-shell-tight">
    {executiveCognitiveState.explanation[0]}
  </div>
</ExecutiveIntelligenceCollapse>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                {unifiedInterruptions.compressed.length > 0
                  ? unifiedInterruptions.explanation
                  : calmExecutionNetwork.instruction}
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Strategic stability {procurementStability.overallStability} · overload forecast {overloadForecast.probability}
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Memory health {operationalMemoryHealth.continuityPersistenceHealth} · preserved {continuityPersistence.preservedCount} · recovery {recoveryMemory.recoveryEffectivenessTrend}
              </div>
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Supervised assistance {supervisedAssistance.operationalAssistanceHealth} · {supervisedActionDraft.title}
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  <ExecutiveIntelligenceCollapse
  title="Executive Intelligence"
  preview={continuitySafeAction.recommendation}
>
  <div className="text-sm text-slate-700 proc-shell-tight">
    {continuitySafeAction.recommendation}
  </div>
</ExecutiveIntelligenceCollapse>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Trust stability {operationalTrust.operationalTrustStability} · reliability {executionReliability.reliabilityLevel}
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  <ExecutiveIntelligenceCollapse
  title="Executive Intelligence"
  preview={workflowPredictability.explanation}
>
  <div className="text-sm text-slate-700 proc-shell-tight">
    {workflowPredictability.explanation}
  </div>
</ExecutiveIntelligenceCollapse>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Mission grid {missionGrid.missionIntelligenceHealth} · {unifiedMissionState.summary}
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  {crossModuleSequencing.explanation}
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-fuchsia-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Coordination network {coordinationNetwork.procurementNetworkHealth} · {workloadHarmonization.harmonizationMode}
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  <ExecutiveIntelligenceCollapse
  title="Executive Intelligence"
  preview={pressureRedistribution.explanation}
>
  <div className="text-sm text-slate-700 proc-shell-tight">
    {pressureRedistribution.explanation}
  </div>
</ExecutiveIntelligenceCollapse>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                Continuity nervous system {procurementNervousSystem.procurementNervousSystemHealth} · {continuityPulse.pulseMode}
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                  {operationalReflex.explanation}
                </div>
              </div>
            </div>

            <div className="grid min-w-[240px] grid-cols-2 gap-3">
              {[
                {
                  label: "Focus",
                  value: executiveCognitiveState.focusResilience,
                },
                {
                  label: "Pressure",
                  value: executiveCognitiveState.cognitiveLoadPressure,
                },
                {
                  label: "Continuity",
                  value: executiveCognitiveState.continuityIntegrity,
                },
                {
                  label: "Priority",
                  value: calmPriorityCount,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-blue-100 bg-white p-3"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {metric.label}
                  </div>

                  <div className="mt-1 text-xl font-black text-slate-950">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className="mt-6">
          <ProcurementLiveTicker />
        </div>

        <CompressionZone
          title="Heatmap intelligence"
          subtitle="Open only when deeper scanning is needed"
          open={showHeatmap}
          onToggle={() => setShowHeatmap((v) => !v)}
        >
          <ProcurementHeatmapIntelligence
            liveEvents={events}
            timelineSteps={[]}
          />
        </CompressionZone>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Stat label="Total" value={summary.total || 0} />
          <Stat label="Critical" value={summary.critical || 0} />
          <Stat label="High" value={summary.high || 0} />
          <Stat label="Active" value={summary.active || 0} />
        </div>

        <CompressionZone
          title="Detailed procurement metrics"
          subtitle="Memory, RFQ, chat and telemetry signals"
          open={showTelemetryStats}
          onToggle={() => setShowTelemetryStats((v) => !v)}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Medium" value={summary.medium || 0} />
            <Stat label="Memory" value={summary.memory || 0} />
            <Stat label="RFQ" value={summary.rfq || 0} />
            <Stat label="Chat" value={summary.chat || 0} />

            <Stat
              label="Load"
              value={telemetry?.telemetry?.operationalLoad || 0}
            />

            <Stat
              label="Recovery"
              value={telemetry?.telemetry?.recoveryPressure || 0}
            />

            <Stat
              label="Stale"
              value={telemetry?.telemetry?.staleConversations || 0}
            />

            <Stat
              label="24h Msg"
              value={telemetry?.telemetry?.messages24h || 0}
            />
          </div>
        </CompressionZone>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Operational filters
          </div>

          <div className="flex flex-wrap gap-3">
          {[
            ["all", "All"],
            ["critical", "Critical"],
            ["high", "High"],
            ["medium", "Medium"],
            ["active", "Active"],
            ["rfq", "RFQ"],
            ["chat", "Chat"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-5 py-3 text-sm font-black transition ${
                filter === key
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setCompactEvents((v) => !v)}
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            {compactEvents ? "Expanded stream" : "Compact stream"}
          </button>

          <Link
            href="/dashboard/procurement-mission-control"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Work Desk
          </Link>

          <Link
            href="/dashboard/procurement-autonomous-tasks"
            className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800"
          >
            Pending Tasks
          </Link>
          </div>
        </div>

        <div className="mt-8 proc-shell-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Adaptive Live Event Stream
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Showing {visibleEvents.length} sequentially organized operational signals from {events.length} live procurement activities.
              </p>
            </div>

            <LiveProcurementRefreshBadge label="Live feed auto-refresh" />
          </div>

          <div className="mt-6 space-y-4">
            {visibleEvents.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm font-bold text-slate-500">
                No live procurement events found for this filter.
              </div>
            ) : (
              visibleEvents.map((event) => {
                const normalizedUrgency = normalizeOperationalUrgency(
                  event.priority || event.tone
                );

                const activityAt = event.updated_at || event.createdAt;
                const activityAgeHours = activityAt
                  ? Math.max(
                      0,
                      Math.round((Date.now() - new Date(activityAt).getTime()) / 3600000)
                    )
                  : 999;

                return (
                  <Link
                  key={`${event.id}-${event.eventType}`}
                  href={event.href || "/dashboard/procurement-live"}
                  className={`block rounded-[1.35rem] border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white ${
                    compactEvents ? "p-4" : "p-5"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneClass(
                            event.tone
                          )}`}
                        >
                          {normalizedUrgency.label} · {event.module || "procurement"}
                        </span>

                        {!compactEvents ? (
                          <>
                            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">
                              {String(event.eventType || "event").replace(/_/g, " ")}
                            </span>

                            <ProcurementDecayBadge
                              compact
                              signals={{
                                workflowAgeHours: activityAgeHours,
                                hoursSinceLastActivity: activityAgeHours,
                                quoteCount: Number(event.score || 0) > 0 ? 1 : 0,
                              }}
                            />
                          </>
                        ) : null}
                      </div>

                      <div className={`${compactEvents ? "mt-2 text-base" : "mt-3 text-lg"} font-black text-slate-950`}>
                        {event.title}
                      </div>

                      <div className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                        {event.description || event.signal || "Procurement event detected."}
                      </div>

                      {event.action ? (
                        <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
                          ðŸ¤– Next action: {event.action}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-[96px] text-left md:text-right">
                      <div className={`${compactEvents ? "text-xl" : "text-3xl"} font-black text-slate-950`}>
                        {eventAttention(event).attentionScore}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Attention
                      </div>
                      <div className={`${compactEvents ? "mt-1" : "mt-3"} text-xs font-bold text-slate-500`}>
                        {fmt(event.updated_at || event.createdAt)}
                      </div>
                    </div>
                  </div>
                  </Link>
                );
              })
            )}

            {hiddenNormalCount > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-600">
                {hiddenNormalCount} lower-attention operational signals compressed. Use Expanded stream to inspect all.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function CompressionZone({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <div className="text-base font-black text-slate-950">{title}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">{subtitle}</div>
        </div>

        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
          {open ? "Hide" : "Open"}
        </span>
      </button>

      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="proc-shell">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
    </div>
  );
}

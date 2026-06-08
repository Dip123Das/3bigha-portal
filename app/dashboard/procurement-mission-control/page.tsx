import Link from "next/link";
import { headers } from "next/headers";
import ProcurementCommandCenterNav from "@/app/components/procurement/ProcurementCommandCenterNav";
import {
evaluateExecutiveCognitiveState,
  getExecutiveCognitiveLabel,
  sequenceExecutiveSignals,
  batchLowValueInterruptions,
} from "@/lib/procurement/intelligence/executive-cognitive-os";
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
import StickyExecutiveActions from "@/components/procurement/StickyExecutiveActions";
import ExecutivePrioritySurface from "@/components/procurement/ExecutivePrioritySurface";
import { evaluateExecutivePriority } from "@/lib/procurement/executive/executive-priority-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrigin() {
  const h = await headers();
  const host = h.get("host") || "";
  const proto = h.get("x-forwarded-proto") || "https";
  return host.startsWith("http") ? host : `${proto}://${host}`;
}

async function loadMission() {
  try {
    const origin = await getOrigin();
    const res = await fetch(`${origin}/api/ai/procurement-mission-control`, {
      cache: "no-store",
    });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

function statusClass(level?: string) {
  if (level === "critical") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "high-risk") return "border-amber-200 bg-amber-50 text-amber-700";
  if (level === "elevated") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default async function ProcurementMissionControlPage() {
  const data = await loadMission();
  const mission = data?.mission || {};
  const priorities = Array.isArray(data?.topPriorities) ? data.topPriorities : [];
  const directives = Array.isArray(data?.emergencyDirectives)
    ? data.emergencyDirectives
    : [];

  let recoveryData: any = null;
  let cognitionData: any = null;
  let stabilizationData: any = null;
  let strategicData: any = null;
  let executiveData: any = null;
  let continuityData: any = null;
  let resilienceData: any = null;

  try {
    const origin = await getOrigin();

    const recoveryRes = await fetch(
      `${origin}/api/ai/procurement-recovery-command-center`,
      {
        cache: "no-store",
      }
    );

    recoveryData = await recoveryRes.json();
  } catch {
    recoveryData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const cognitionRes = await fetch(
      `${origin}/api/ai/procurement-unified-cognition`,
      {
        cache: "no-store",
      }
    );

    cognitionData = await cognitionRes.json();
  } catch {
    cognitionData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const stabilizationRes = await fetch(
      `${origin}/api/ai/procurement-self-stabilization`,
      {
        cache: "no-store",
      }
    );

    stabilizationData = await stabilizationRes.json();
  } catch {
    stabilizationData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const strategicRes = await fetch(
      `${origin}/api/ai/procurement-strategic-orchestration`,
      {
        cache: "no-store",
      }
    );

    strategicData = await strategicRes.json();
  } catch {
    strategicData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const executiveRes = await fetch(
      `${origin}/api/ai/procurement-executive-synthesis`,
      {
        cache: "no-store",
      }
    );

    executiveData = await executiveRes.json();
  } catch {
    executiveData = { ok: false };
  }

  try {
    const origin = await getOrigin();

    const continuityRes = await fetch(
      `${origin}/api/ai/procurement-executive-continuity`,
      {
        cache: "no-store",
      }
    );

    continuityData = await continuityRes.json();
  } catch {
    continuityData = { ok: false };
  }

  const executiveSignals = [
    {
      id: "continuity-primary",
      source: "mission_control" as const,
      title: "Executive continuity monitoring",
      severity:
        continuityData?.continuity?.continuityPressure >= 75
          ? ("critical" as const)
          : continuityData?.continuity?.continuityPressure >= 45
            ? ("actionable" as const)
            : ("watch" as const),
      workflowId: continuityData?.continuity?.continuityMode || "continuity",
    },
    ...(Array.isArray(continuityData?.directives)
      ? continuityData.directives.slice(0, 6).map((directive: any, index: number) => ({
          id: `directive-${index}`,
          source: "mission_control" as const,
          title: directive.title || directive.directive || "Operational directive",
          severity:
            directive.priority === "critical"
              ? ("critical" as const)
              : directive.priority === "high"
                ? ("actionable" as const)
                : ("watch" as const),
          workflowId:
            directive.workflowId ||
            directive.category ||
            `workflow-${index}`,
        }))
      : []),
  ];

  const executiveCognitiveState =
    evaluateExecutiveCognitiveState(executiveSignals);

  const sequencedSignals =
    sequenceExecutiveSignals(executiveSignals);

  const interruptionBatching =
    batchLowValueInterruptions(sequencedSignals);

  const sharedFocusState = createSharedFocusState(
    "mission_control",
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

  try {
    const origin = await getOrigin();

    const resilienceRes = await fetch(
      `${origin}/api/ai/procurement-adaptive-resilience`,
      {
        cache: "no-store",
      }
    );

    resilienceData = await resilienceRes.json();
  } catch {
    resilienceData = { ok: false };
  }

  const cognition =
    cognitionData?.cognition || {};


const executivePriority = evaluateExecutivePriority({
  critical: mission.criticalThreads ?? 0,
  warning: mission.criticalSignals ?? 0,
  recoveryPressure: mission.recoveryPressure ?? 0,
  escalationPressure: cognition.escalationPressure ?? 0,
  recoveryLikely: cognition.recoveryLikely,
});


  const recoveryItems = Array.isArray(
    recoveryData?.recovery
  )
    ? recoveryData.recovery
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="proc-density-hero border border-slate-200 bg-gradient-to-r from-slate-950 via-indigo-950 to-rose-950 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
          Enterprise Procurement Work Desk
        </div>

        <h1 className="mt-4 text-3xl font-bold">
          AI Procurement Work Desk
        </h1>

        <p className="mt-3 max-w-4xl text-sm font-medium leading-5 text-slate-200">
          Unified executive command layer for procurement health, crisis level,
          execution urgency, live operations and autonomous AI directives.
        </p>

        <div className="proc-density-stack rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-bold text-slate-100">
          {data?.executiveSummary || "Mission intelligence unavailable."}
        </div>
      </div>

      <ProcurementCommandCenterNav />

      {!data?.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          Procurement mission control could not load.
        </div>
      ) : null}

      <div className="grid grid-cols-1 proc-density-grid md:grid-cols-13">
        <Stat label="Health" value={`${mission.healthScore ?? 0}/100`} />
        <Stat label="Crisis" value={mission.crisisLevel || "unknown"} />
        <Stat label="Threat" value={mission.operationalThreat ?? 0} />
        <Stat label="Critical Threads" value={mission.criticalThreads ?? 0} />
        <Stat label="Critical Signals" value={mission.criticalSignals ?? 0} />
        <Stat label="Live Events" value={mission.liveEvents ?? 0} />

        <Stat
          label="Operational Load"
          value={mission.operationalLoad ?? 0}
        />

        <Stat
          label="Recovery Pressure"
          value={mission.recoveryPressure ?? 0}
        />

        <Stat
          label="Stale Threads"
          value={mission.staleConversations ?? 0}
        />
      </div>

      <div className={`rounded-2xl border p-4 ${
        executiveData?.synthesis?.executiveMode === "executive-intervention"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : executiveData?.synthesis?.executiveMode === "executive-watch"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Executive Procurement Synthesis
            </div>

            <div className="mt-2 text-xl font-bold">
              {executiveData?.synthesis?.executiveMode || "executive-stable"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {executiveData?.executiveDirective ||
                "Procurement ecosystem remains operationally stable under supervised executive monitoring."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Pressure {executiveData?.synthesis?.executivePressure || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Approvals {executiveData?.synthesis?.approvals || 0}
            </div>
          </div>
        </div>

        {Array.isArray(executiveData?.directives) &&
        executiveData.directives.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {executiveData.directives.slice(0, 4).map((directive: any) => (
              <div
                key={directive.title}
                className="rounded-xl border border-white/30 bg-white/40 px-3 py-2"
              >
                <div className="text-sm font-semibold">
                  {directive.title}
                </div>

                <div className="mt-1.5 text-xs font-semibold leading-5">
                  {directive.directive}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {directive.executiveImpact}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>


      <div className={`rounded-2xl border p-4 ${
        continuityData?.continuity?.continuityMode === "continuity-intervention"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : continuityData?.continuity?.continuityMode === "continuity-watch"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">

        <div
          style={{
            border: "1px solid #dbeafe",
            background: "#f8fbff",
            borderRadius: "1rem",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#1d4ed8",
                  marginBottom: "0.3rem",
                }}
              >
                Executive Cognitive State
              </div>

              <div
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {getExecutiveCognitiveLabel(executiveCognitiveState)}
              </div>
              <div
                style={{
                  display: "inline-flex",
                  marginTop: "0.5rem",
                  border: "1px solid #bfdbfe",
                  background: "#ffffff",
                  color: "#1d4ed8",
                  borderRadius: "999px",
                  padding: "0.3rem 0.7rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                }}
              >
                {calmExecutionNetwork.visibleLabel}
              </div>

              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#475569",
                  marginTop: "0.45rem",
                  maxWidth: "42rem",
                  lineHeight: 1.6,
                }}
              >
                {executiveCognitiveState.explanation[0]}
              </div>
              <div
                style={{
                  marginTop: "0.65rem",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Strategic stability {procurementStability.overallStability} · overload forecast {overloadForecast.probability}
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#334155",
                }}
              >
                Memory health {operationalMemoryHealth.continuityPersistenceHealth} · preserved {continuityPersistence.preservedCount} · sequence {sequencingHistory.recommendedSequence}
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #bbf7d0",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#166534",
                }}
              >
                Supervised assistance {supervisedAssistance.operationalAssistanceHealth} · {supervisedActionDraft.title}
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {recoveryPacing.message}
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #bae6fd",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#075985",
                }}
              >
                Trust stability {operationalTrust.operationalTrustStability} · reliability {executionReliability.reliabilityLevel}
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {recoveryConsistency.explanation}
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #ddd6fe",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#5b21b6",
                }}
              >
                Mission grid {missionGrid.missionIntelligenceHealth} · {unifiedMissionState.summary}
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {missionRecovery.explanation}
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #a5f3fc",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#155e75",
                }}
              >
                Continuity nervous system {procurementNervousSystem.procurementNervousSystemHealth} · {continuityPulse.pulseMode}
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {continuityAnomalyReflex.explanation}
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.55rem",
                  border: "1px solid #f5d0fe",
                  background: "#ffffff",
                  borderRadius: "0.9rem",
                  padding: "0.7rem 0.85rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "#86198f",
                }}
              >
                Coordination network {coordinationNetwork.procurementNetworkHealth} · {workloadHarmonization.harmonizationMode}
                <div
                  style={{
                    marginTop: "0.35rem",
                    fontSize: "0.78rem",
                    lineHeight: 1.5,
                    color: "#475569",
                  }}
                >
                  {continuityLoadBalancing.explanation}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.45rem",
                minWidth: "240px",
                alignContent: "flex-start",
              }}
            >
              {[
                { label: "Focus", value: executiveCognitiveState.focusResilience },
                { label: "Continuity", value: executiveCognitiveState.continuityIntegrity },
                { label: "Rhythm", value: executiveCognitiveState.operationalRhythmStability },
                { label: "Pressure", value: executiveCognitiveState.cognitiveLoadPressure },
              ].map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    border: "1px solid #dbeafe",
                    borderRadius: "999px",
                    padding: "0.45rem 0.7rem",
                    background: "#ffffff",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#64748b",
                      fontWeight: 700,
                    }}
                  >
                    {metric.label}
                  </span>

                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {interruptionBatching.batched.length > 0 ? (
            <div
              style={{
                marginTop: "0.9rem",
                paddingTop: "0.8rem",
                borderTop: "1px dashed #cbd5e1",
                fontSize: "0.78rem",
                color: "#475569",
              }}
            >
              {unifiedInterruptions.explanation}
            </div>
          ) : null}
        </div>

              Executive Continuity Intelligence
            </div>

            <div className="mt-2 text-xl font-bold">
              {continuityData?.continuity?.continuityMode || "continuity-stable"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {continuityData?.executiveDirective ||
                "Procurement ecosystem remains continuity-stable under supervised executive monitoring."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Pressure {continuityData?.continuity?.continuityPressure || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Memory {continuityData?.continuity?.evolutionScore || 0}
            </div>
          </div>
        </div>

        {Array.isArray(continuityData?.directives) &&
        continuityData.directives.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {continuityData.directives.slice(0, 4).map((directive: any) => (
              <div
                key={directive.title}
                className="rounded-xl border border-white/30 bg-white/40 px-3 py-2"
              >
                <div className="text-sm font-semibold">
                  {directive.title}
                </div>

                <div className="mt-1.5 text-xs font-semibold leading-5">
                  {directive.directive}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {directive.continuityImpact}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>


      <div className={`rounded-2xl border p-4 ${
        resilienceData?.resilience?.resilienceMode === "resilience-focus"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : resilienceData?.resilience?.resilienceMode === "guided-compression"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Adaptive Executive Resilience
            </div>

            <div className="mt-2 text-xl font-bold">
              {resilienceData?.resilience?.resilienceMode || "normal-visibility"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {resilienceData?.executiveDirective ||
                "Executive operational visibility remains balanced and stable."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Pressure {resilienceData?.resilience?.adaptivePressure || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Density {resilienceData?.resilience?.signalDensity || "full-context"}
            </div>
          </div>
        </div>

        {Array.isArray(resilienceData?.guidance) &&
        resilienceData.guidance.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {resilienceData.guidance.slice(0, 4).map((item: any) => (
              <div
                key={item.title}
                className="rounded-xl border border-white/30 bg-white/40 px-3 py-2"
              >
                <div className="text-sm font-semibold">
                  {item.title}
                </div>

                <div className="mt-1.5 text-xs font-semibold leading-5">
                  {item.recommendation}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {item.safety}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>


      <div className={`rounded-2xl border p-4 ${
        cognition.predictiveRisk === "critical"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : cognition.predictiveRisk === "high"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : cognition.predictiveRisk === "elevated"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Predictive Procurement Cognition
            </div>

            <div className="mt-2 text-xl font-bold">
              {cognition.trajectory || "stable"} • {cognition.predictiveRisk || "low"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {cognitionData?.executiveSummary ||
                "Procurement cognition stable."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Cognition {cognition.cognitionScore || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Drift {cognition.operationalDrift || 0}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {cognition.silentRiskDetected ? (
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
              Silent operational weakening detected
            </span>
          ) : null}

          {cognition.escalationLikely ? (
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
              Escalation pressure rising
            </span>
          ) : null}

          {cognition.recoveryLikely ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              Recovery likely with intervention
            </span>
          ) : null}
        </div>

        <div className="mt-3 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 text-sm font-bold">
          {cognitionData?.nextBestAction ||
            "Continue procurement operational monitoring."}
        </div>

        {Array.isArray(cognition.reasons) &&
        cognition.reasons.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {cognition.reasons.slice(0, 4).map((reason: string) => (
              <div
                key={reason}
                className="rounded-2xl border border-white/30 bg-white/40 px-4 py-3 text-sm font-bold"
              >
                {reason}
              </div>
            ))}
          </div>
        ) : null}
      </div>



      <div className={`rounded-2xl border p-4 ${
        stabilizationData?.stabilization?.stabilizationMode === "active-stabilization"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : stabilizationData?.stabilization?.stabilizationMode === "watch-stabilization"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Operational Self-Stabilization
            </div>

            <div className="mt-2 text-xl font-bold">
              {stabilizationData?.stabilization?.stabilizationMode || "stable-monitoring"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {stabilizationData?.executiveDirective ||
                "Procurement operations remain stable under supervised AI monitoring."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Pressure {stabilizationData?.stabilization?.stabilizationPressure || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Fatigue {stabilizationData?.stabilization?.fatigue || 0}
            </div>
          </div>
        </div>

        {Array.isArray(stabilizationData?.actions) &&
        stabilizationData.actions.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {stabilizationData.actions.slice(0, 4).map((action: any) => (
              <div
                key={action.title}
                className="rounded-xl border border-white/30 bg-white/40 px-3 py-2"
              >
                <div className="text-sm font-semibold">
                  {action.title}
                </div>

                <div className="mt-1.5 text-xs font-semibold leading-5">
                  {action.recommendation}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {action.safety}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>


      <div className={`rounded-2xl border p-4 ${
        strategicData?.orchestration?.orchestrationMode === "strategic-intervention"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : strategicData?.orchestration?.orchestrationMode === "strategic-watch"
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em]">
              Strategic Procurement Orchestration
            </div>

            <div className="mt-2 text-xl font-bold">
              {strategicData?.orchestration?.orchestrationMode || "strategic-stable"}
            </div>

            <div className="mt-2 max-w-3xl text-sm font-semibold leading-5">
              {strategicData?.executiveDirective ||
                "Strategic procurement ecosystem remains stable under supervised monitoring."}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Pressure {strategicData?.orchestration?.orchestrationPressure || 0}
            </div>

            <div className="rounded-full border border-white/40 bg-white/50 px-3 py-1.5 text-xs font-black">
              Weak Suppliers {strategicData?.orchestration?.weakSuppliers || 0}
            </div>
          </div>
        </div>

        {Array.isArray(strategicData?.directives) &&
        strategicData.directives.length > 0 ? (
          <div className="mt-3 grid proc-density-grid md:grid-cols-2">
            {strategicData.directives.slice(0, 4).map((directive: any) => (
              <div
                key={directive.title}
                className="rounded-xl border border-white/30 bg-white/40 px-3 py-2"
              >
                <div className="text-sm font-semibold">
                  {directive.title}
                </div>

                <div className="mt-1.5 text-xs font-semibold leading-5">
                  {directive.recommendation}
                </div>

                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                  {directive.strategicImpact}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>


      <div className={`rounded-2xl border p-4 ${statusClass(mission.crisisLevel)}`}>
        <div className="text-xs font-black uppercase tracking-[0.14em]">
          Current Operating Condition
        </div>
        <div className="mt-2 text-xl font-bold">
          {mission.healthStatus || "Unknown"} • {mission.executionMode || "unknown"}
        </div>
        <div className="mt-3 text-sm font-semibold leading-5">
          {data?.nextBestAction || "Open procurement inbox and review workflows."}
        </div>
      </div>

      <div className="grid grid-cols-1 proc-density-grid lg:grid-cols-2">
        <Panel title="Top Operational Priorities" items={priorities} tone="amber" />
        <Panel title="Emergency Directives" items={directives} tone="rose" />
      </div>

            <div className="proc-density-shell border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              AI Procurement Recovery Work Desk
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Unified recovery orchestration, stabilization intelligence and operational readiness monitoring.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
              Readiness: {recoveryData?.readinessScore || 0}
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700">
              Stabilization: {recoveryData?.stabilizationScore || 0}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-800">
          {recoveryData?.operationalRecovery}
        </div>

        
<StickyExecutiveActions
  title="Mission Command State"
  items={[
    {
      label: "Critical Threads",
      value: mission.criticalThreads ?? 0,
      tone: (mission.criticalThreads ?? 0) > 0 ? "danger" : "safe",
    },
    {
      label: "Critical Signals",
      value: mission.criticalSignals ?? 0,
      tone: (mission.criticalSignals ?? 0) > 0 ? "warning" : "safe",
    },
    {
      label: "Recovery Pressure",
      value: mission.recoveryPressure ?? 0,
      tone: (mission.recoveryPressure ?? 0) > 65 ? "danger" : "info",
    },
    {
      label: "Operational State",
      value: cognition.recoveryLikely ? "Recovery Likely" : "Stable",
      tone: cognition.recoveryLikely ? "warning" : "safe",
    },
  ]}
/>

<div className="proc-density-stack-lg grid proc-density-grid lg:grid-cols-2">
          {recoveryItems.map((item: any) => (
            <div
              key={item.title}
              className="proc-density-shell border border-slate-200 bg-slate-50"
            >
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                    item.severity === "Critical"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : item.severity === "High"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : item.severity === "Medium"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {item.severity}
                </span>
              </div>

              <div className="mt-4 text-xl font-bold text-slate-950">
                {item.title}
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>Recovery Probability</span>
                  <span>{item.probability}%</span>
                </div>

                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${
                      item.probability >= 80
                        ? "bg-emerald-500"
                        : item.probability >= 60
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${item.probability}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                🤖 {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 proc-density-grid md:grid-cols-6">
        <Shortcut href="/dashboard/procurement-crisis-center" icon="🚨" title="Issue Center" />
        <Shortcut href="/dashboard/procurement-os" icon="🧭" title="Procurement Workspace" />
        <Shortcut href="/dashboard/procurement-war-room" icon="🏛️" title="Priority Work" />
        <Shortcut href="/dashboard/procurement-situation-room" icon="📡" title="Work Updates" />
        <Shortcut href="/dashboard/procurement-heatmap" icon="🔥" title="Risk Overview" />
        <Shortcut href="/dashboard/procurement-actions" icon="⚡" title="Pending Actions" />
        <Shortcut href="/dashboard/procurement-followup-agent" icon="🤖" title="Follow-up AI" />
        <Shortcut href="/dashboard/procurement-inbox-actions" icon="📥" title="Inbox Help" />
        <Shortcut href="/dashboard/procurement-negotiation-agent" icon="🤝" title="Negotiation" />
        <Shortcut href="/dashboard/procurement-supplier-reliability" icon="🏭" title="Supplier Overview" />
        <Shortcut href="/dashboard/procurement-memory-intelligence" icon="🧠" title="Recent Workflow" />
        <Shortcut href="/dashboard/procurement-closure-agent" icon="✅" title="Closure Tracking" />
        <Shortcut href="/dashboard/procurement-autonomous-tasks" icon="🛠️" title="Pending Tasks" />
        <Shortcut href="/dashboard/procurement-task-execution-log" icon="📜" title="Activity Log" />
        <Shortcut href="/dashboard/procurement-real-execution" icon="🚀" title="Real Execute" />
        <Shortcut href="/dashboard/procurement-crisis-center" icon="🛡️" title="Recovery Command" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="proc-density-metric border border-slate-200 bg-white shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function Panel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "amber" | "rose";
}) {
  const box =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="proc-density-shell border border-slate-200 bg-white shadow-sm">
      <div className="text-lg font-black text-slate-950">{title}</div>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            No urgent items detected.
          </div>
        ) : (
          items.map((item) => (
            <div key={item} className={`rounded-2xl border p-4 text-sm font-bold ${box}`}>
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Shortcut({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="proc-density-metric border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-3 text-sm font-semibold text-slate-950">{title}</div>
    </Link>
  );
}
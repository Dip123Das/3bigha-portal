import {
  loadProcurementWorkflow,
} from "@/lib/procurement/procurementWorkflowMemory";

import {
  loadSiteExecution,
} from "@/lib/execution/siteExecutionMemory";

import {
  loadProjectActivities,
} from "@/lib/activity/projectActivityMemory";

export type OperationalAlert = {
  id: string;

  level:
    | "info"
    | "warning"
    | "critical";

  title: string;

  recommendation: string;
};

export function generateOperationalAlerts():
  OperationalAlert[] {

  const alerts: OperationalAlert[] = [];

  const procurement =
    loadProcurementWorkflow();

  const execution =
    loadSiteExecution();

  const activities =
    loadProjectActivities();

  const runningExecution =
    execution.filter(
      (x) => x.status === "running"
    );

  if (
    runningExecution.some(
      (x) => x.stage === "brick_work"
    )
  ) {
    const cementOrdered =
      procurement.some(
        (x) =>
          x.material
            .toLowerCase()
            .includes("cement") &&
          (
            x.stage === "ordered" ||
            x.stage === "dispatched" ||
            x.stage === "delivered"
          )
      );

    if (!cementOrdered) {
      alerts.push({
        id: "cement-warning",
        level: "warning",
        title:
          "Cement procurement may be insufficient",
        recommendation:
          "Create RFQ or order cement soon.",
      });
    }
  }

  const pendingProcurement =
    procurement.filter(
      (x) =>
        x.stage === "estimated" ||
        x.stage === "rfq_sent"
    );

  if (pendingProcurement.length >= 3) {
    alerts.push({
      id: "procurement-delay",
      level: "warning",
      title:
        "Multiple procurement items pending",
      recommendation:
        "Review vendor response and procurement execution.",
    });
  }

  if (activities.length === 0) {
    alerts.push({
      id: "activity-missing",
      level: "info",
      title:
        "No operational activity detected",
      recommendation:
        "Start workflows to activate collaboration continuity.",
    });
  }

  const completed =
    execution.filter(
      (x) => x.status === "completed"
    ).length;

  if (completed >= 6) {
    alerts.push({
      id: "project-progress",
      level: "info",
      title:
        "Project execution progressing steadily",
      recommendation:
        "Continue procurement and execution continuity.",
    });
  }

  return alerts;
}

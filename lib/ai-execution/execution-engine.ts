import type {
  AiExecutionAction,
  AiExecutionInput,
  AiExecutionPlan,
  AiExecutionUrgency,
} from "@/lib/ai-execution/execution-types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function enc(value: string) {
  return encodeURIComponent(value || "marketplace requirement");
}

function detectIntent(query: string, module: string) {
  const q = query.toLowerCase();

  return {
    materials:
      module === "materials" ||
      /cement|tmt|rod|steel|brick|sand|stone|chips|aggregate|paint|tiles|সিমেন্ট|রড|ইট/.test(q),
    property:
      module === "property" ||
      /land|plot|flat|house|home|property|katha|কাঠা|জমি|বাড়ি|जमीन/.test(q),
    services:
      module === "services" ||
      /mason|rajmistri|contractor|plumber|electrician|architect|labour|মিস্ত্রি|রাজমিস্ত্রি/.test(q),
    rentals:
      module === "rentals" ||
      /jcb|rental|rent|mixer|machine|scaffold|ভাড়া/.test(q),
    bulk:
      /\b\d+\b|bags|ton|tons|cft|sqft|kg|bulk|truck|লোড/.test(q),
    urgent:
      /urgent|today|tomorrow|immediate|fast|জরুরি|তাড়াতাড়ি/.test(q),
    investment:
      /investment|return|growth|profit|bargain|বিনিয়োগ/.test(q),
  };
}

function priorityRank(priority: AiExecutionUrgency) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function uniqueActions(actions: AiExecutionAction[]) {
  const seen = new Set<string>();

  return actions
    .filter((action) => {
      const key = `${action.title}-${action.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, 6);
}

export function buildAiExecutionPlan(input: AiExecutionInput): AiExecutionPlan {
  const query = cleanText(input.query);
  const module = cleanText(input.module || "all").toLowerCase();
  const source = input.source || "global";
  const encoded = enc(query);

  const intent = detectIntent(query, module);
  const actions: AiExecutionAction[] = [];
  const signals: string[] = [];

  let score = 35;
  let urgency: AiExecutionUrgency = "normal";
  let stage = "Workflow ready";

  if (query) {
    score += 15;
    signals.push("query intent detected");
  }

  if (intent.bulk) {
    score += 12;
    signals.push("bulk/quantity signal");
  }

  if (intent.urgent || input.inboxUrgency === "Critical" || input.inboxUrgency === "Now") {
    score += 18;
    urgency = "critical";
    signals.push("urgent execution signal");
  }

  if (input.workflowRisk === "High") {
    score += 18;
    urgency = "high";
    signals.push("workflow risk high");
  }

  if (input.closurePrediction === "High") {
    score += 12;
    signals.push("high closure probability");
  }

  if (typeof input.readinessScore === "number") {
    score += Math.round(Math.min(20, input.readinessScore / 5));
  }

  if (typeof input.negotiationScore === "number") {
    score += Math.round(Math.min(15, input.negotiationScore / 7));
  }

  if (intent.materials) {
    stage = "Material procurement execution";

    actions.push(
      {
        id: "create-rfq",
        title: "Create RFQ",
        description: intent.bulk
          ? "Convert this bulk material requirement into vendor quotations."
          : "Convert this material search into a structured RFQ.",
        href: `/rfq?query=${encoded}&module=materials`,
        icon: "⚡",
        type: "rfq",
        priority: "high",
      },
      {
        id: "compare-vendors",
        title: "Compare suppliers",
        description: "Find nearby vendors and compare supply readiness.",
        href: `/vendor/discovery?q=${encoded}&module=materials`,
        icon: "🎯",
        type: "vendor",
        priority: "high",
      },
      {
        id: "check-price",
        title: "Check price",
        description: "Use price intelligence before negotiation.",
        href: `/price-today?q=${encoded}`,
        icon: "📊",
        type: "price",
        priority: "high",
      },
      {
        id: "logistics",
        title: "Estimate logistics",
        description: "Plan delivery, unloading and transport before final quote.",
        href: `/services?q=${encoded}%20transport%20unloading`,
        icon: "🚚",
        type: "logistics",
        priority: "medium",
      }
    );
  }

  if (intent.property) {
    stage = "Property-to-construction execution";

    actions.push(
      {
        id: "construction-estimate",
        title: "Estimate construction",
        description: "Check building cost after land/property discovery.",
        href: "/house-construction-cost",
        icon: "🏗️",
        type: "construction",
        priority: "high",
      },
      {
        id: "find-builders",
        title: "Find builders",
        description: "Compare contractors and service providers nearby.",
        href: `/vendor/discovery?q=${encoded}%20builder%20contractor&module=services`,
        icon: "👷",
        type: "vendor",
        priority: "medium",
      },
      {
        id: "investment-score",
        title: "Investment check",
        description: "Review growth and investment potential.",
        href: `/investment/opportunities?q=${encoded}`,
        icon: "📈",
        type: "investment",
        priority: intent.investment ? "high" : "medium",
      },
      {
        id: "legal-check",
        title: "Legal verification",
        description: "Plan title, mutation and document verification.",
        href: `/search?q=${encoded}%20legal%20verification&module=services`,
        icon: "⚖️",
        type: "legal",
        priority: "medium",
      }
    );
  }

  if (intent.services) {
    stage = "Service execution workflow";

    actions.push(
      {
        id: "hire-rfq",
        title: "Create hiring RFQ",
        description: "Send work scope to local service providers.",
        href: `/rfq?query=${encoded}&module=services`,
        icon: "📝",
        type: "rfq",
        priority: "high",
      },
      {
        id: "service-vendors",
        title: "Compare providers",
        description: "Find suitable vendors for this service requirement.",
        href: `/vendor/discovery?q=${encoded}&module=services`,
        icon: "🎯",
        type: "vendor",
        priority: "high",
      }
    );
  }

  if (intent.rentals) {
    stage = "Rental execution workflow";

    actions.push(
      {
        id: "rental-availability",
        title: "Check availability",
        description: "Confirm rental availability, operator and duration.",
        href: `/rentals?search=${encoded}`,
        icon: "🚜",
        type: "workflow",
        priority: "high",
      },
      {
        id: "operator-support",
        title: "Find operator",
        description: "Add operator/service support if needed.",
        href: `/services?q=${encoded}%20operator`,
        icon: "👷",
        type: "vendor",
        priority: "medium",
      }
    );
  }

  if (source === "inbox" || input.procurementStage || input.workflowRisk) {
    stage = input.procurementStage || "Inbox execution workflow";

    actions.push(
      {
        id: "open-priority-inbox",
        title: "Open priority threads",
        description: "Review unread, stale or high-risk conversations first.",
        href: "/dashboard/inbox-v2?sort=unread",
        icon: "📨",
        type: "followup",
        priority: input.workflowRisk === "High" ? "critical" : "high",
      },
      {
        id: "recovery",
        title: "Recover stalled deals",
        description: "Move stalled conversations toward reply, quote or closure.",
        href: "/dashboard/inbox-v2",
        icon: "🩺",
        type: "recovery",
        priority: input.workflowRisk === "High" ? "critical" : "medium",
      },
      {
        id: "procurement-live",
        title: "Open Procurement Live",
        description: "Monitor execution health and procurement movement.",
        href: "/dashboard/procurement-live",
        icon: "🧠",
        type: "monitor",
        priority: "medium",
      }
    );
  }

  actions.push({
    id: "continue-workflow",
    title: "Continue workflow",
    description: "Resume this marketplace workflow and continue execution.",
    href: query
      ? `/search?q=${encoded}${module !== "all" ? `&module=${encodeURIComponent(module)}` : ""}`
      : "/search",
    icon: "🔎",
    type: "workflow",
    priority: "normal",
  });

  score = Math.max(1, Math.min(100, Math.round(score)));

  if (urgency !== "critical") {
    urgency = score >= 78 ? "high" : score >= 58 ? "medium" : "normal";
  }

  const finalActions = uniqueActions(actions);

  return {
    show: Boolean(query || source === "inbox" || input.procurementStage),
    title:
      urgency === "critical"
        ? "AI execution requires immediate action"
        : urgency === "high"
          ? "AI recommends execution now"
          : "AI execution layer is ready",
    subtitle:
      "Deterministic workflow intelligence converts intent, urgency and marketplace signals into next best actions.",
    stage,
    urgency,
    score,
    actions: finalActions,
    signals: signals.slice(0, 5),
  };
}
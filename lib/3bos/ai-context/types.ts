export type ThreeBOSAiPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type ThreeBOSAiActionSource =
  | "runtime"
  | "workspace"
  | "journey"
  | "notification"
  | "route"
  | "fallback";

export type ThreeBOSAiContextWorkspace = {
  key: string | null;
  title: string;
  description?: string | null;
};

export type ThreeBOSAiContextJourney = {
  key: string | null;
  title: string;
  description?: string | null;
  href?: string | null;
};

export type ThreeBOSAiContextAction = {
  id: string;
  title: string;
  description?: string | null;
  href?: string | null;
  icon?: string | null;
  source: ThreeBOSAiActionSource;
  priority: ThreeBOSAiPriority;
};

export type ThreeBOSAiContextAttentionItem = {
  id: string;
  title: string;
  description?: string | null;
  href?: string | null;
  priority: Exclude<ThreeBOSAiPriority, "low">;
  source: "notification" | "timeline" | "runtime";
};

export type ThreeBOSAiContextActivity = {
  id: string;
  title: string;
  description?: string | null;
  href?: string | null;
  occurredAt?: string | null;
  tone?:
    | "neutral"
    | "information"
    | "success"
    | "warning"
    | "attention";
};

export type ThreeBOSAiPageArea =
  | "public"
  | "dashboard"
  | "buyer"
  | "vendor"
  | "admin"
  | "rfq"
  | "property"
  | "materials"
  | "services"
  | "rentals"
  | "chat"
  | "support"
  | "unknown";

export type ThreeBOSAiPageContext = {
  pathname: string;
  area: ThreeBOSAiPageArea;
  title: string;
  description: string;
  suggestedActions: ThreeBOSAiContextAction[];
};

export type ThreeBOSAiContextProjection = {
  version: "p03e-b-v1";
  generatedAt: string;

  readiness: {
    state: string;
    operational: boolean;
    authenticated: boolean;
  };

  page: ThreeBOSAiPageContext;

  workspace: ThreeBOSAiContextWorkspace | null;
  journey: ThreeBOSAiContextJourney | null;

  attention: {
    count: number;
    urgentCount: number;
    items: ThreeBOSAiContextAttentionItem[];
  };

  actions: {
    recommended: ThreeBOSAiContextAction[];
    continueWork: ThreeBOSAiContextAction[];
    fallback: ThreeBOSAiContextAction[];
  };

  activity: ThreeBOSAiContextActivity[];

  assistant: {
    heading: string;
    summary: string;
    promptContext: string;
  };
};

export type ThreeBOSAiInputAction = {
  id?: string | null;
  key?: string | null;
  title?: string | null;
  label?: string | null;
  description?: string | null;
  href?: string | null;
  icon?: string | null;
  priority?: string | null;
};

export type ThreeBOSAiInputNotification = {
  id?: string | null;
  title?: string | null;
  message?: string | null;
  href?: string | null;
  priority?: string | null;
  status?: string | null;
  dismissed?: boolean | null;
};

export type ThreeBOSAiInputActivity = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  message?: string | null;
  href?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
  tone?: string | null;
};

export type ThreeBOSAiContextInput = {
  pathname?: string | null;

  runtimeStatus?: string | null;
  readinessState?: string | null;
  authenticated?: boolean | null;

  workspace?: {
    key?: string | null;
    title?: string | null;
    description?: string | null;
  } | null;

  journey?: {
    key?: string | null;
    title?: string | null;
    description?: string | null;
    href?: string | null;
  } | null;

  primaryActions?: ThreeBOSAiInputAction[] | null;
  crossWorkspaceActions?: ThreeBOSAiInputAction[] | null;
  notifications?: ThreeBOSAiInputNotification[] | null;
  activity?: ThreeBOSAiInputActivity[] | null;

  limits?: {
    recommendedActions?: number;
    continueActions?: number;
    attentionItems?: number;
    activityItems?: number;
  } | null;
};

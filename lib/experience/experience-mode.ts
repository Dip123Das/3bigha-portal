export type ExperienceMode = "simple" | "smart" | "advanced";

export const EXPERIENCE_MODE_STORAGE_KEY = "3bigha.experience.mode.v1";

export const DEFAULT_EXPERIENCE_MODE: ExperienceMode = "simple";

export const EXPERIENCE_MODES: {
  value: ExperienceMode;
  title: string;
  badge: string;
  description: string;
  bestFor: string;
}[] = [
  {
    value: "simple",
    title: "Simple Mode",
    badge: "Default",
    description: "Clean and easy experience for everyday users.",
    bestFor: "Buyers, villagers, first-time users and simple marketplace use.",
  },
  {
    value: "smart",
    title: "Smart Mode",
    badge: "Recommended",
    description: "More workflow assistance, suggestions and helpful shortcuts.",
    bestFor: "Contractors, suppliers, regular buyers and active users.",
  },
  {
    value: "advanced",
    title: "Advanced Mode",
    badge: "Full Workspace",
    description: "Full operational and AI-powered workspace visibility.",
    bestFor: "Power users, operators, admins, vendors and serious project teams.",
  },
];

export function isExperienceMode(value: unknown): value is ExperienceMode {
  return value === "simple" || value === "smart" || value === "advanced";
}

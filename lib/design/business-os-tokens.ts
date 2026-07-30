export const businessOsColors = {
  ink: "#13233d",
  muted: "#66758b",
  line: "#dbe5f3",
  surface: "#ffffff",
  canvas: "#f5f8ff",
  primary: "#1767ef",
  primarySoft: "#eff6ff",
  success: "#0a9954",
  successSoft: "#f0fdf4",
  warning: "#d97706",
  warningSoft: "#fff7ed",
  signal: "#6f56dc",
  signalSoft: "#f5f3ff",
} as const;

export const businessOsSpacing = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 } as const;
export const businessOsRadius = { control: 10, card: 16, panel: 22, pill: 999 } as const;
export const businessOsShadow = {
  card: "0 8px 24px rgba(15, 23, 42, 0.07)",
  floating: "0 12px 30px rgba(15, 23, 42, 0.18)",
} as const;

export const businessOsTone = {
  neutral: { border: businessOsColors.line, background: businessOsColors.surface, foreground: businessOsColors.ink },
  primary: { border: "#bfdbfe", background: businessOsColors.primarySoft, foreground: businessOsColors.primary },
  success: { border: "#bbf7d0", background: businessOsColors.successSoft, foreground: businessOsColors.success },
  warning: { border: "#fed7aa", background: businessOsColors.warningSoft, foreground: businessOsColors.warning },
  signal: { border: "#ddd6fe", background: businessOsColors.signalSoft, foreground: businessOsColors.signal },
} as const;

export type BusinessOsTone = keyof typeof businessOsTone;

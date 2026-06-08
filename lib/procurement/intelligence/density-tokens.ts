import { OperationalDensityMode } from "./adaptive-collapse-engine";

export type DensityTokenSet = {
  spacing: string;
  padding: string;
  stack: string;
  cardRadius: string;
  text: string;
  pillLimit: number;
};

export const densityTokens: Record<OperationalDensityMode, DensityTokenSet> = {
  calm: {
    spacing: "gap-2",
    padding: "p-3",
    stack: "space-y-2",
    cardRadius: "rounded-2xl",
    text: "text-sm",
    pillLimit: 2,
  },
  standard: {
    spacing: "gap-3",
    padding: "p-4",
    stack: "space-y-3",
    cardRadius: "rounded-[1.25rem]",
    text: "text-sm",
    pillLimit: 4,
  },
  dense: {
    spacing: "gap-1.5",
    padding: "p-2",
    stack: "space-y-1.5",
    cardRadius: "rounded-xl",
    text: "text-xs",
    pillLimit: 6,
  },
};

export function getDensityTokens(mode: OperationalDensityMode = "standard") {
  return densityTokens[mode] || densityTokens.standard;
}

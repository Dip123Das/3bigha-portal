import { ExecutiveAttentionMode, IntelligenceDisclosureLevel } from "./adaptive-collapse-engine";

export type MobileExecutiveRoutingInput = {
  isMobile?: boolean;
  attentionMode?: ExecutiveAttentionMode;
  disclosureLevel?: IntelligenceDisclosureLevel;
  visibleCards?: number;
  criticalCount?: number;
};

export type MobileExecutiveRouting = {
  maxVisibleCards: number;
  showStickySurface: boolean;
  showSecondaryIntelligence: boolean;
  compressPills: boolean;
  preserveCriticalActions: boolean;
};

export function resolveMobileExecutiveRouting(
  input: MobileExecutiveRoutingInput = {},
): MobileExecutiveRouting {
  if (!input.isMobile) {
    return {
      maxVisibleCards: input.attentionMode === "critical" ? 8 : 6,
      showStickySurface: true,
      showSecondaryIntelligence: input.disclosureLevel !== "minimal",
      compressPills: false,
      preserveCriticalActions: true,
    };
  }

  const critical = input.attentionMode === "critical" || Number(input.criticalCount || 0) > 0;

  return {
    maxVisibleCards: critical ? 5 : 3,
    showStickySurface: critical,
    showSecondaryIntelligence:
      critical || input.disclosureLevel === "detailed" || input.disclosureLevel === "full",
    compressPills: true,
    preserveCriticalActions: true,
  };
}

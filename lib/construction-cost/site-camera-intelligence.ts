import type { SignalSeverity } from "./construction-ai-signals";

export type SiteCameraIntelligence = {
  projectId: string;
  generatedAt: string;
  enabled: boolean;
  readiness: "not_connected" | "photo_ready" | "camera_ready" | "future_ai_ready";
  risk: SignalSeverity;
  message: string;
  futureCapabilities: string[];
};

export function generateSiteCameraIntelligence(projectId: string): SiteCameraIntelligence {
  return {
    projectId,
    generatedAt: new Date().toISOString(),
    enabled: false,
    readiness: "future_ai_ready",
    risk: "low",
    message:
      "Photo/CCTV intelligence is prepared architecturally. Future uploads can verify site progress, material delivery, and labour activity.",
    futureCapabilities: [
      "Daily site photo verification",
      "Material delivery proof checking",
      "CCTV-based activity monitoring",
      "Before-after milestone comparison",
      "AI progress fraud detection",
    ],
  };
}

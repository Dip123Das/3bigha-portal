import { usePreventScreenCapture } from "expo-screen-capture";
import type { PropsWithChildren } from "react";

const ROOT_CAPTURE_GUARD = "3bigha-root-private-surface";

export function ScreenCaptureProtection({ children }: PropsWithChildren) {
  usePreventScreenCapture(ROOT_CAPTURE_GUARD);
  return children;
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_EXPERIENCE_MODE,
  EXPERIENCE_MODE_STORAGE_KEY,
  isExperienceMode,
  type ExperienceMode,
} from "@/lib/experience/experience-mode";

type ExperienceModeContextValue = {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isSimple: boolean;
  isSmart: boolean;
  isAdvanced: boolean;
  showSmart: boolean;
  showAdvanced: boolean;
};

const ExperienceModeContext = createContext<ExperienceModeContextValue | null>(null);

export default function ExperienceModeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mode, setModeState] = useState<ExperienceMode>(DEFAULT_EXPERIENCE_MODE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(EXPERIENCE_MODE_STORAGE_KEY);
      if (isExperienceMode(stored)) {
        setModeState(stored);
        document.documentElement.dataset.experienceMode = stored;
      } else {
        document.documentElement.dataset.experienceMode = DEFAULT_EXPERIENCE_MODE;
      }
    } catch {
      document.documentElement.dataset.experienceMode = DEFAULT_EXPERIENCE_MODE;
    }
  }, []);

  function setMode(nextMode: ExperienceMode) {
    setModeState(nextMode);

    try {
      window.localStorage.setItem(EXPERIENCE_MODE_STORAGE_KEY, nextMode);
      document.documentElement.dataset.experienceMode = nextMode;
      window.dispatchEvent(
        new CustomEvent("3bigha:experience-mode-change", {
          detail: { mode: nextMode },
        })
      );
    } catch {
      // Experience mode should never break the app.
    }
  }

  const value = useMemo<ExperienceModeContextValue>(
    () => ({
      mode,
      setMode,
      isSimple: mode === "simple",
      isSmart: mode === "smart",
      isAdvanced: mode === "advanced",
      showSmart: mode === "smart" || mode === "advanced",
      showAdvanced: mode === "advanced",
    }),
    [mode]
  );

  return (
    <ExperienceModeContext.Provider value={value}>
      {children}
    </ExperienceModeContext.Provider>
  );
}

export function useExperienceMode() {
  const ctx = useContext(ExperienceModeContext);
  if (!ctx) {
    throw new Error("useExperienceMode must be used inside ExperienceModeProvider");
  }
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EXPERIENCE_MODE,
  EXPERIENCE_MODES,
  EXPERIENCE_MODE_STORAGE_KEY,
  isExperienceMode,
  type ExperienceMode,
} from "@/lib/experience/experience-mode";

export default function ExperienceModeSettings() {
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
      // Settings should never break the app.
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
          Visibility
        </div>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          Experience Mode
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          Choose how much detail you want to see. Simple Mode stays clean by default,
          while AI and smart systems can still work quietly in the background.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {EXPERIENCE_MODES.map((item) => {
          const active = mode === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={
                active
                  ? "rounded-2xl border-2 border-blue-600 bg-blue-50 p-4 text-left shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-300 hover:bg-white"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-black text-slate-950">
                  {item.title}
                </div>
                <span
                  className={
                    active
                      ? "rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white"
                      : "rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500"
                  }
                >
                  {active ? "Selected" : item.badge}
                </span>
              </div>

              <p className="mt-3 text-sm font-bold leading-6 text-slate-700">
                {item.description}
              </p>

              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                Best for: {item.bestFor}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

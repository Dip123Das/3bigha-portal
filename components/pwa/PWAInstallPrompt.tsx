"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    const dismissed = localStorage.getItem("3bigha_install_prompt_dismissed");
    if (dismissed === "yes") return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const fallbackTimer = window.setTimeout(() => {
      if (!isStandalone) setShow(true);
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  async function installApp() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
      return;
    }

    alert(
      "To install 3bigha: open browser menu and choose 'Install app' or 'Add to Home screen'."
    );
  }

  function dismiss() {
    localStorage.setItem("3bigha_install_prompt_dismissed", "yes");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-[9999] mx-auto max-w-xl rounded-2xl border border-green-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-lg font-bold text-white">
          3B
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">
            Install 3bigha App
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Open 3bigha like a mobile app with faster access from your home screen.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              onClick={installApp}
              className="rounded-xl bg-green-700 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              Install App
            </button>

            <button
              onClick={dismiss}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

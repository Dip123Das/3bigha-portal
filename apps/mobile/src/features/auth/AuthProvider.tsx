import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getNativeSupabase } from "@/lib/auth/supabase";
import { consumeNativeAuthCallback } from "@/lib/auth/callback";

type AuthState = {
  session: Session | null;
  ready: boolean;
  initialSessionRestored: boolean | null;
  configurationMissing: boolean;
  callbackError: string | null;
  foregroundReady: boolean;
  foregroundError: boolean;
  retryForegroundValidation(): void;
  clearCallbackError(): void;
};

const AuthContext = createContext<AuthState | null>(null);

async function completeAuthCallback(url: string) {
  const supabase = getNativeSupabase();
  if (!supabase) return;
  const code = consumeNativeAuthCallback(url);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = getNativeSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [initialSessionRestored, setInitialSessionRestored] = useState<boolean | null>(supabase ? null : false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [foregroundReady, setForegroundReady] = useState(!supabase);
  const [foregroundError, setForegroundError] = useState(false);

  const validateForegroundSession = useCallback(async () => {
    if (!supabase) return;
    setForegroundReady(false);
    setForegroundError(false);
    const { data: saved, error: savedError } = await supabase.auth.getSession();
    if (savedError) { setForegroundError(true); return; }
    if (!saved.session) { setSession(null); setForegroundReady(true); return; }
    const { data, error } = await supabase.auth.refreshSession(saved.session);
    if (!error && data.session) { setSession(data.session); setForegroundReady(true); return; }
    const status = typeof error?.status === "number" ? error.status : 0;
    if (status === 400 || status === 401 || status === 403) {
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setForegroundReady(true);
      return;
    }
    setForegroundError(true);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setCallbackError("Your saved session could not be restored. Please sign in again.");
      setInitialSessionRestored(Boolean(data.session));
      setSession(data.session ?? null);
      setReady(true);
      if (!data.session) setForegroundReady(true);
      else void validateForegroundSession();
    });

    const authSubscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });
    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      void completeAuthCallback(url).catch(() => {
        setCallbackError("That sign-in link is invalid or has expired. Please request a new one.");
      });
    });
    void Linking.getInitialURL().then((url) => {
      if (url) return completeAuthCallback(url);
    }).catch(() => {
      setCallbackError("That sign-in link could not be completed. Please request a new one.");
    });

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
        void validateForegroundSession();
      } else {
        supabase.auth.stopAutoRefresh();
        setForegroundReady(false);
        setForegroundError(false);
      }
    });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();

    return () => {
      active = false;
      supabase.auth.stopAutoRefresh();
      authSubscription.data.subscription.unsubscribe();
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [supabase, validateForegroundSession]);

  const value = useMemo<AuthState>(() => ({
    session,
    ready,
    initialSessionRestored,
    configurationMissing: !supabase,
    callbackError,
    foregroundReady,
    foregroundError,
    retryForegroundValidation: () => { void validateForegroundSession(); },
    clearCallbackError: () => setCallbackError(null),
  }), [callbackError, foregroundError, foregroundReady, initialSessionRestored, ready, session, supabase, validateForegroundSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

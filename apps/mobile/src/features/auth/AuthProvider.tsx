import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
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
  configurationMissing: boolean;
  callbackError: string | null;
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
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setCallbackError("Your saved session could not be restored. Please sign in again.");
      setSession(data.session ?? null);
      setReady(true);
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
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();

    return () => {
      active = false;
      supabase.auth.stopAutoRefresh();
      authSubscription.data.subscription.unsubscribe();
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [supabase]);

  const value = useMemo<AuthState>(() => ({
    session,
    ready,
    configurationMissing: !supabase,
    callbackError,
    clearCallbackError: () => setCallbackError(null),
  }), [callbackError, ready, session, supabase]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

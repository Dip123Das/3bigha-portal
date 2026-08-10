import * as LocalAuthentication from "expo-local-authentication";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { getNativeSupabase } from "@/lib/auth/supabase";

const REAUTHENTICATION_INTERVAL_MS = 60_000;
const FOREGROUND_INACTIVITY_INTERVAL_MS = 5 * 60_000;

type DeviceReauthenticationState = {
  deviceReady: boolean;
  deviceError: boolean;
  retryDeviceAuthentication(): void;
  signOutSafely(): void;
  registerLocalInteraction(): void;
};

const DeviceReauthenticationContext = createContext<DeviceReauthenticationState | null>(null);

export function DeviceReauthenticationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const backgroundedAt = useRef<number | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  const [deviceReady, setDeviceReady] = useState(true);
  const [deviceError, setDeviceError] = useState(false);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = null;
  }, []);

  const authenticateReturningPerson = useCallback(async () => {
    const currentAttempt = ++attempt.current;
    setDeviceReady(false);
    setDeviceError(false);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock 3Bigha",
      cancelLabel: "Keep locked",
      fallbackLabel: "Use device passcode",
      disableDeviceFallback: false,
    }).catch(() => null);
    if (currentAttempt !== attempt.current || AppState.currentState !== "active") return;
    if (result?.success) {
      setDeviceReady(true);
      return;
    }
    setDeviceError(true);
  }, []);

  const armInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (!session || AppState.currentState !== "active") return;
    inactivityTimer.current = setTimeout(() => {
      inactivityTimer.current = null;
      void authenticateReturningPerson();
    }, FOREGROUND_INACTIVITY_INTERVAL_MS);
  }, [authenticateReturningPerson, clearInactivityTimer, session]);

  const registerLocalInteraction = useCallback(() => {
    if (deviceReady && !deviceError) armInactivityTimer();
  }, [armInactivityTimer, deviceError, deviceReady]);

  const signOutSafely = useCallback(() => {
    const supabase = getNativeSupabase();
    attempt.current += 1;
    setDeviceError(false);
    setDeviceReady(false);
    if (supabase) void supabase.auth.signOut({ scope: "local" });
  }, []);

  useEffect(() => {
    if (!session) {
      clearInactivityTimer();
      attempt.current += 1;
      backgroundedAt.current = null;
      setDeviceError(false);
      setDeviceReady(true);
    } else if (deviceReady) {
      armInactivityTimer();
    }
  }, [armInactivityTimer, clearInactivityTimer, deviceReady, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        clearInactivityTimer();
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        if (session) setDeviceReady(false);
        return;
      }

      const awaySince = backgroundedAt.current;
      backgroundedAt.current = null;
      if (!session || awaySince === null || Date.now() - awaySince < REAUTHENTICATION_INTERVAL_MS) {
        setDeviceError(false);
        setDeviceReady(true);
        armInactivityTimer();
        return;
      }
      void authenticateReturningPerson();
    });
    return () => {
      subscription.remove();
      clearInactivityTimer();
    };
  }, [armInactivityTimer, authenticateReturningPerson, clearInactivityTimer, session]);

  const value = useMemo<DeviceReauthenticationState>(() => ({
    deviceReady,
    deviceError,
    retryDeviceAuthentication: () => { void authenticateReturningPerson(); },
    signOutSafely,
    registerLocalInteraction,
  }), [authenticateReturningPerson, deviceError, deviceReady, registerLocalInteraction, signOutSafely]);

  return <DeviceReauthenticationContext.Provider value={value}>{children}</DeviceReauthenticationContext.Provider>;
}

export function useDeviceReauthentication() {
  const value = useContext(DeviceReauthenticationContext);
  if (!value) throw new Error("useDeviceReauthentication must be used inside DeviceReauthenticationProvider");
  return value;
}

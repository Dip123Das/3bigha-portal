import {
  getPrimaryLegacyIdentitySuggestion,
  resolveLegacyIdentitySuggestions,
  type LegacyIdentitySignals,
} from "../identity";
import type { RegistrationIdentityInterpretation } from "./types";

export const REGISTRATION_IDENTITY_SESSION_KEY =
  "3bos.registration.identity-interpretation.v1";

function freezeSignals(
  signals: LegacyIdentitySignals
): LegacyIdentitySignals {
  return Object.freeze({
    role: signals.role ?? null,
    portalUseReason: signals.portalUseReason ?? null,
    moduleKeys: [...(signals.moduleKeys ?? [])],
    natureOfBusiness: [...(signals.natureOfBusiness ?? [])],
    businessType: signals.businessType ?? null,
  });
}

export function interpretRegistrationIdentity(
  signals: LegacyIdentitySignals
): RegistrationIdentityInterpretation {
  const suggestions = resolveLegacyIdentitySuggestions(signals);
  const primary = getPrimaryLegacyIdentitySuggestion(signals);

  const confidence =
    primary != null
      ? "clear"
      : suggestions.length > 0
        ? "ambiguous"
        : "unresolved";

  return Object.freeze({
    version: 1,
    primaryIdentity: primary?.identity.key ?? null,
    primaryIdentityLabel: primary?.identity.label ?? null,
    confidence,
    suggestions: Object.freeze([...suggestions]),
    legacySignals: freezeSignals(signals),
    authoritative: false,
    persistedToDatabase: false,
    interpretedAt: new Date().toISOString(),
  });
}

export function persistRegistrationIdentityInterpretation(
  interpretation: RegistrationIdentityInterpretation
): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      REGISTRATION_IDENTITY_SESSION_KEY,
      JSON.stringify(interpretation)
    );
  } catch {}
}

export function readRegistrationIdentityInterpretation():
  | RegistrationIdentityInterpretation
  | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(
      REGISTRATION_IDENTITY_SESSION_KEY
    );

    if (!raw) return null;

    const parsed = JSON.parse(
      raw
    ) as RegistrationIdentityInterpretation;

    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

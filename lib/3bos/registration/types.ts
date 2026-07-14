import type {
  HumanIdentityKey,
  IdentitySuggestion,
  LegacyIdentitySignals,
} from "../identity";

export type RegistrationIdentityInterpretation = {
  version: 1;
  primaryIdentity: HumanIdentityKey | null;
  primaryIdentityLabel: string | null;
  confidence: "clear" | "ambiguous" | "unresolved";
  suggestions: readonly IdentitySuggestion[];
  legacySignals: LegacyIdentitySignals;
  authoritative: false;
  persistedToDatabase: false;
  interpretedAt: string;
};

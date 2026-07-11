import type {
  CapabilityKey,
  CapabilityResolution,
} from "../capability";

import type {
  ThreeBOSAvailableAction,
  ThreeBOSRuntime,
  ThreeBOSRuntimeInput,
} from "../runtime";

export type ThreeBOSRuntimeContextStatus =
  | "uninitialized"
  | "ready"
  | "ambiguous";

export type ThreeBOSRuntimeContextValue = {
  /**
   * Current resolved runtime.
   *
   * It remains null until a page or bootstrap component supplies
   * authenticated compatibility signals.
   */
  runtime: ThreeBOSRuntime | null;

  /**
   * Compatibility inputs used to create the current runtime.
   */
  input: ThreeBOSRuntimeInput | null;

  /**
   * Context lifecycle state.
   *
   * uninitialized:
   * No compatibility signals have been supplied.
   *
   * ready:
   * A primary Human Identity was resolved or no identity decision
   * is presently required.
   *
   * ambiguous:
   * Signals produced possible identities but require human selection.
   */
  status: ThreeBOSRuntimeContextStatus;

  /**
   * Supply or replace compatibility inputs.
   *
   * This does not write to the database.
   * This does not modify authentication.
   */
  setRuntimeInput: (
    input: ThreeBOSRuntimeInput | null
  ) => void;

  /**
   * Merge a partial compatibility update into the current input.
   */
  updateRuntimeInput: (
    input: Partial<ThreeBOSRuntimeInput>
  ) => void;

  /**
   * Clear the runtime, normally after logout or account change.
   */
  clearRuntime: () => void;

  /**
   * Read a resolved capability without repeating lookup logic.
   */
  getCapability: (
    capability: CapabilityKey
  ) => CapabilityResolution | null;

  /**
   * Check whether the current runtime includes a usable capability.
   */
  hasCapability: (
    capability: CapabilityKey
  ) => boolean;

  /**
   * Human actions already filtered by identity, workspace and plan.
   */
  availableActions: ThreeBOSAvailableAction[];
};

import {
  standardUploadStrategy,
} from "./standard-upload-strategy";
import {
  trustedUploadStrategy,
} from "./trusted-upload-strategy";
import type {
  MediaUploadStrategyKey,
  UploadStrategy,
  UploadStrategyInput,
  UploadStrategyResult,
} from "./upload-strategy";

const STRATEGIES: Record<
  MediaUploadStrategyKey,
  UploadStrategy
> = {
  standard: standardUploadStrategy,
  trusted: trustedUploadStrategy,
};

export function resolveUploadStrategy(
  input: Pick<
    UploadStrategyInput,
    "trusted"
  >,
  requestedStrategy?: MediaUploadStrategyKey
): UploadStrategy {
  const strategyKey =
    requestedStrategy ??
    (input.trusted
      ? "trusted"
      : "standard");

  if (
    strategyKey === "trusted" &&
    !input.trusted
  ) {
    throw new Error(
      "Trusted upload strategy requires a trusted capture context."
    );
  }

  return STRATEGIES[strategyKey];
}

export async function executeMediaUpload(
  input: UploadStrategyInput,
  requestedStrategy?: MediaUploadStrategyKey
): Promise<UploadStrategyResult> {
  const strategy =
    resolveUploadStrategy(
      input,
      requestedStrategy
    );

  return strategy.upload(input);
}

export async function executeStandardMediaUpload(
  input: UploadStrategyInput
): Promise<UploadStrategyResult> {
  return executeMediaUpload(
    input,
    "standard"
  );
}

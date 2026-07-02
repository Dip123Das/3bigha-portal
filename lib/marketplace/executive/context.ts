export type ExecutiveLogger = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

export type ExecutiveContext = {
  supabase?: any;
  logger: ExecutiveLogger;
  now: Date;
  environment: "development" | "production" | "test";
  config: {
    signalLimit: number;
  };
};

export function createExecutiveContext(
  overrides: Partial<ExecutiveContext> = {},
): ExecutiveContext {
  return {
    supabase: overrides.supabase,
    logger: overrides.logger || console,
    now: overrides.now || new Date(),
    environment:
      overrides.environment ||
      (process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development"),
    config: {
      signalLimit: overrides.config?.signalLimit || 10,
    },
  };
}

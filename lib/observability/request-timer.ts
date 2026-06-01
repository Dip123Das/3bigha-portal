export async function withRequestTimer<T>(
  label: string,
  fn: () => Promise<T>,
  options?: {
    slowThresholdMs?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<T> {
  const started = Date.now();

  try {
    const result = await fn();

    const duration = Date.now() - started;

    if (
      process.env.NODE_ENV !== "production" ||
      duration > (options?.slowThresholdMs ?? 2000)
    ) {
      console.log(
        JSON.stringify({
          type: "request_timing",
          label,
          duration,
          slow:
            duration > (options?.slowThresholdMs ?? 2000),
          metadata: options?.metadata || {},
          at: new Date().toISOString(),
        })
      );
    }

    return result;
  } catch (error) {
    const duration = Date.now() - started;

    console.error(
      JSON.stringify({
        type: "request_error",
        label,
        duration,
        metadata: options?.metadata || {},
        error:
          error instanceof Error
            ? error.message
            : String(error),
        at: new Date().toISOString(),
      })
    );

    throw error;
  }
}

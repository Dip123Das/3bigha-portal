type Callback<T> = (payload: T) => void;

export function createRealtimeThrottle<T>(
  callback: Callback<T>,
  delay = 400
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let latestPayload: T | null = null;

  return (payload: T) => {
    latestPayload = payload;

    if (timeout) return;

    timeout = setTimeout(() => {
      timeout = null;

      if (latestPayload !== null) {
        callback(latestPayload);
      }
    }, delay);
  };
}

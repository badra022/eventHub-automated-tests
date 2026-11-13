export interface RetryOptions {
  attempts?: number;
  delay?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const TRANSIENT_NETWORK_ERROR = /ECONNRESET|ETIMEDOUT|ECONNREFUSED|EACCES|EPIPE|socket hang up|read ECONN/i;

export function isTransientNetworkError(error: unknown): boolean {
  return TRANSIENT_NETWORK_ERROR.test(error instanceof Error ? error.message : String(error));
}

/** Runs the operation, retrying it while `shouldRetry` accepts the thrown error (transient network errors by default). */
export async function retry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const delay = options.delay ?? 2_000;
  const shouldRetry = options.shouldRetry ?? isTransientNetworkError;

  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }
      options.onRetry?.(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

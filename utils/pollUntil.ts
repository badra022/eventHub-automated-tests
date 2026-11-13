export interface PollUntilOptions {
  timeout?: number;
  delay?: number;
  timeoutMessage?: string;
}

export async function pollUntil<T>(
  operation: () => Promise<T | null | undefined>,
  options: PollUntilOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? 30_000;
  const delay = options.delay ?? 2_000;
  const deadline = Date.now() + timeout;

  do {
    const result = await operation();
    if (result != null) {
      return result;
    }

    if (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  } while (Date.now() < deadline);

  throw new Error(
    options.timeoutMessage ?? `Polling timed out after ${timeout}ms.`,
  );
}

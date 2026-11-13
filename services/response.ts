import type { APIResponse } from '@playwright/test';

/** Returns the JSON body of a successful response, or throws with the status and body so failures are readable. */
export async function parseOk<T>(response: APIResponse, action: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${action} failed (${response.status()} ${response.statusText()}): ${await response.text()}`);
  }
  return (await response.json()) as T;
}

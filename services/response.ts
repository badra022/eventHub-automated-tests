import type { APIResponse } from '@playwright/test';
import { Logger, toLoggable } from '../utils/logger';

const logger = new Logger('api-response');

/** Returns the JSON body of a successful response, or logs and throws with the status and (protected) body. */
export async function parseOk<T>(response: APIResponse, action: string): Promise<T> {
  if (!response.ok()) {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = toLoggable(JSON.parse(text));
    } catch {
      // not JSON: keep the raw text
    }
    logger.error(`${action} failed`, { status: response.status(), url: response.url(), body });
    throw new Error(`${action} failed (${response.status()} ${response.statusText()}): ${JSON.stringify(body)}`);
  }
  return (await response.json()) as T;
}

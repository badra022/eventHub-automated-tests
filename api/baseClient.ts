import type { APIRequestContext, APIResponse } from '@playwright/test';
import { Logger } from '../utils/logger';
import { retry } from '../utils/retry';

export interface APIClientConfig {
  baseUrl: string;
  /** Bearer token sent on every request unless a request overrides it */
  token?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryParams = Record<string, string | number | boolean>;

/**
 * Per-request overrides, so negative tests can exercise the API through the same clients:
 * `token` omitted -> the configured token, a string -> that token, `null` -> no Authorization header.
 */
export interface RequestOptions {
  token?: string | null;
  params?: QueryParams;
  /** Retry on transient network errors even for non-GET methods; only for callers that accept a repeat (e.g. cleanup). */
  retryOnNetworkError?: boolean;
}

/** Thin HTTP layer shared by the API clients: base URL, bearer auth and request logging. No assertions here. */
export abstract class BaseAPIClient {
  protected readonly baseUrl: string;
  protected readonly logger: Logger;
  private token: string | undefined;

  protected constructor(
    private readonly request: APIRequestContext,
    config: APIClientConfig,
    name: string,
  ) {
    if (!config.baseUrl) {
      throw new Error(`${name}: baseUrl is required`);
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.token = config.token;
    this.logger = new Logger(name);
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  protected async send(method: HttpMethod, path: string, data?: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    const token = options.token === undefined ? this.token : options.token;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const started = performance.now();
    const fetch = () =>
      this.request.fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        params: options.params,
        ...(data === undefined ? {} : { data }),
      });
    let response: APIResponse;
    try {
      // GET is retried by default; repeating a POST or DELETE could change the outcome a test asserts
      response =
        method === 'GET' || options.retryOnNetworkError
          ? await retry(fetch, {
              attempts: 3,
              delay: 1_000,
              onRetry: (error, attempt) =>
                this.logger.warn(`${method} ${path} hit a transient network error, retrying`, { attempt, error }),
            })
          : await fetch();
    } catch (error) {
      this.logger.error(`${method} ${path} failed before a response was received`, { params: options.params, error });
      throw error;
    }

    const durationMs = Math.round(performance.now() - started);
    if (this.logger.isDebugEnabled()) {
      this.logger.debug(`${method} ${path} -> ${response.status()}`, {
        durationMs,
        authenticated: !!token,
        params: options.params,
        requestBody: data,
        responseBody: await readBody(response),
      });
    }
    return response;
  }
}

const MAX_LOGGED_TEXT = 4_000;

async function readBody(response: APIResponse): Promise<unknown> {
  const text = await response.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text.length > MAX_LOGGED_TEXT ? `${text.slice(0, MAX_LOGGED_TEXT)}... (${text.length} chars)` : text;
  }
}

/** Drops undefined values so optional query fields are not sent as "undefined". */
export function toQueryParams(query: object = {}): QueryParams {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as QueryParams;
}

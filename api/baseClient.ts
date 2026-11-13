import type { APIRequestContext, APIResponse } from '@playwright/test';
import { Logger } from '../utils/logger';

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
    const response = await this.request.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      params: options.params,
      ...(data === undefined ? {} : { data }),
    });
    this.logger.debug(`${method} ${path} -> ${response.status()}`, {
      durationMs: Math.round(performance.now() - started),
      authenticated: !!token,
    });
    return response;
  }
}

/** Drops undefined values so optional query fields are not sent as "undefined". */
export function toQueryParams(query: object = {}): QueryParams {
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as QueryParams;
}

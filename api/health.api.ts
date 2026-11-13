import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPIClient, type APIClientConfig } from './baseClient';

/** Public endpoints: `GET /health`, `GET /config` */
export class HealthAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, config: APIClientConfig) {
    super(request, config, 'health-api');
  }

  async health(): Promise<APIResponse> {
    return this.send('GET', '/health', undefined, { token: null });
  }

  async featureFlags(): Promise<APIResponse> {
    return this.send('GET', '/config', undefined, { token: null });
  }
}

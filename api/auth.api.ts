import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPIClient, type APIClientConfig, type RequestOptions } from './baseClient';
import type { UserCredentials } from './types';

/** `POST /auth/register`, `POST /auth/login`, `GET /auth/me` */
export class AuthAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, config: APIClientConfig) {
    super(request, config, 'auth-api');
  }

  async register(credentials: UserCredentials | Record<string, unknown>): Promise<APIResponse> {
    return this.send('POST', '/auth/register', credentials, { token: null });
  }

  async login(credentials: UserCredentials | Record<string, unknown>): Promise<APIResponse> {
    return this.send('POST', '/auth/login', credentials, { token: null });
  }

  async me(options?: RequestOptions): Promise<APIResponse> {
    return this.send('GET', '/auth/me', undefined, options);
  }
}

import type { APIRequestContext, APIResponse } from '@playwright/test';
import { AuthAPIClient } from '../api/auth.api';
import type { RequestOptions } from '../api/baseClient';
import type { AuthResponse, MeResponse, UserCredentials } from '../api/types';
import { Logger } from '../utils/logger';
import { parseOk } from './response';

const logger = new Logger('auth-service');

export interface AuthServiceConfig {
  baseUrl: string;
}

/** Account lifecycle: register, log in, validate a token. Accounts cannot be deleted once registered. */
export class AuthService {
  private readonly client: AuthAPIClient;

  constructor(request: APIRequestContext, config: AuthServiceConfig) {
    this.client = new AuthAPIClient(request, config);
  }

  /** POST /auth/login without asserting the status (negative tests read status and body themselves). */
  async requestLogin(credentials: UserCredentials | Record<string, unknown>): Promise<APIResponse> {
    const response = await this.client.login(credentials);
    logger.info('Sent login request', { status: response.status() });
    return response;
  }

  /** POST /auth/register without asserting the status. */
  async requestRegister(credentials: UserCredentials | Record<string, unknown>): Promise<APIResponse> {
    const response = await this.client.register(credentials);
    logger.info('Sent register request', { status: response.status() });
    return response;
  }

  /** GET /auth/me without asserting the status; `token: null` sends no Authorization header. */
  async requestMe(options?: RequestOptions): Promise<APIResponse> {
    const response = await this.client.me(options);
    logger.info('Sent GET /auth/me', { status: response.status(), withToken: options?.token !== null });
    return response;
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    logger.debug('Logging in', { email: credentials.email });
    const body = await parseOk<AuthResponse>(await this.client.login(credentials), 'Login');
    logger.info('Logged in', { userId: body.user.id });
    logger.debug('Login response', { user: body.user, token: body.token });
    return body;
  }

  async register(credentials: UserCredentials): Promise<AuthResponse> {
    logger.debug('Registering account', { email: credentials.email });
    const body = await parseOk<AuthResponse>(await this.client.register(credentials), 'Register');
    logger.info('Registered account', { userId: body.user.id });
    return body;
  }

  async me(token: string): Promise<MeResponse> {
    const body = await parseOk<MeResponse>(await this.client.me({ token }), 'GET /auth/me');
    logger.debug('Token identity', { user: body.user });
    return body;
  }
}

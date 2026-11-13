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
    return this.client.login(credentials);
  }

  /** POST /auth/register without asserting the status. */
  async requestRegister(credentials: UserCredentials | Record<string, unknown>): Promise<APIResponse> {
    return this.client.register(credentials);
  }

  /** GET /auth/me without asserting the status; `token: null` sends no Authorization header. */
  async requestMe(options?: RequestOptions): Promise<APIResponse> {
    return this.client.me(options);
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    const body = await parseOk<AuthResponse>(await this.client.login(credentials), 'Login');
    logger.info('Logged in', { userId: body.user.id });
    return body;
  }

  async register(credentials: UserCredentials): Promise<AuthResponse> {
    const body = await parseOk<AuthResponse>(await this.client.register(credentials), 'Register');
    logger.info('Registered account', { userId: body.user.id });
    return body;
  }

  /** Logs in, registering the account first when it does not exist yet (login returns 404). */
  async loginOrRegister(credentials: UserCredentials): Promise<AuthResponse> {
    const response = await this.client.login(credentials);
    if (response.status() === 404) {
      logger.info('Account not registered yet, registering it');
      return this.register(credentials);
    }
    return parseOk<AuthResponse>(response, 'Login');
  }

  async me(token: string): Promise<MeResponse> {
    return parseOk<MeResponse>(await this.client.me({ token }), 'GET /auth/me');
  }
}

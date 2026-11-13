import type { APIRequestContext } from '@playwright/test';
import { HealthAPIClient } from '../api/health.api';
import type { HealthResponse } from '../api/types';
import { Logger } from '../utils/logger';
import { pollUntil } from '../utils/pollUntil';

const logger = new Logger('health-service');

export interface HealthServiceConfig {
  baseUrl: string;
}

export class HealthService {
  private readonly client: HealthAPIClient;

  constructor(request: APIRequestContext, config: HealthServiceConfig) {
    this.client = new HealthAPIClient(request, config);
  }

  /** Polls GET /health until it reports `status: ok`; throws with the last observed state otherwise. */
  async waitUntilHealthy(timeout = 30_000): Promise<HealthResponse> {
    const done = logger.timed('API is healthy');
    let lastState = 'no response';
    let attempt = 0;
    try {
      const health = await pollUntil(
        async () => {
          attempt++;
          try {
            const response = await this.client.health();
            const body = response.ok() ? ((await response.json()) as HealthResponse) : null;
            lastState = `${response.status()} ${JSON.stringify(body)}`;
            logger.debug('Health check attempt', { attempt, status: response.status(), body });
            return body?.status === 'ok' ? body : null;
          } catch (error) {
            lastState = error instanceof Error ? error.message : String(error);
            logger.debug('Health check attempt failed', { attempt, error });
            return null;
          }
        },
        { timeout, delay: 3_000 },
      );
      if (attempt > 1) {
        logger.warn('API became healthy only after retries', { attempts: attempt });
      }
      done();
      return health;
    } catch {
      logger.error('API is not healthy; the run cannot start', { timeout, attempts: attempt, lastState });
      throw new Error(`API was not healthy within ${timeout}ms (last: ${lastState})`);
    }
  }
}

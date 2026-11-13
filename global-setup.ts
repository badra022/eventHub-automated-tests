import { request } from '@playwright/test';
import dotenv from 'dotenv';
import { getEnvConfig, type AppEnvironment } from './config/env';
import { HealthService } from './services';
import { Logger } from './utils/logger';

dotenv.config();

const logger = new Logger('global-setup');

/** Health check gate (risk T1): no test runs against an environment that is down. */
export default async function globalSetup(): Promise<void> {
  const appEnv = (process.env.APP_ENV ?? 'prod') as AppEnvironment;
  const config = getEnvConfig(appEnv);
  const context = await request.newContext();
  try {
    await new HealthService(context, { baseUrl: config.API_BASE_URL }).waitUntilHealthy();
    logger.info(`API is healthy on "${appEnv}"`, { apiBaseUrl: config.API_BASE_URL });
  } finally {
    await context.dispose();
  }
}

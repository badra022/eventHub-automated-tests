import { Logger } from '../utils/logger';

const logger = new Logger('env-config');

export const APP_ENVIRONMENTS = ['prod', 'local'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type EnvConfig = {
  APP_BASE_URL: string;
  API_BASE_URL: string;
  /** Passphrase that decrypts the `enc:v1:` values in test-data (see utils/crypto.ts) */
  TEST_DATA_KEY: string;
};

type Secrets = Record<string, string | undefined>;

type EnvironmentMap = Record<AppEnvironment, EnvConfig>;

function buildEnvironments(secrets: Secrets): EnvironmentMap {
  const prod: EnvConfig = {
    APP_BASE_URL: secrets.PROD_APP_BASE_URL ?? 'https://eventhub.rahulshettyacademy.com',
    API_BASE_URL: secrets.PROD_API_BASE_URL ?? 'https://api.eventhub.rahulshettyacademy.com/api',
    TEST_DATA_KEY: secrets.TEST_DATA_KEY ?? '',
  };

  const local: EnvConfig = {
    APP_BASE_URL: secrets.LOCAL_APP_BASE_URL ?? 'http://localhost:3000',
    API_BASE_URL: secrets.LOCAL_API_BASE_URL ?? 'http://localhost:3001/api',
    TEST_DATA_KEY: secrets.TEST_DATA_KEY ?? '',
  };

  return { prod, local };
}

let envMap: EnvironmentMap | null = null;

export function getEnvConfig(): EnvironmentMap;
export function getEnvConfig(env: AppEnvironment): EnvConfig;
export function getEnvConfig(env?: AppEnvironment): EnvironmentMap | EnvConfig {
  if (!envMap) {
    // Values come from .env locally and from GitHub environment secrets/variables in CI
    envMap = buildEnvironments({ ...process.env });
    logger.info(`Environment configs built for: ${Object.keys(envMap).join(', ')}`);
  }

  if (env) {
    const config = envMap[env];
    if (!config) {
      throw new Error(`Unknown environment "${env}". Available: ${APP_ENVIRONMENTS.join(', ')}`);
    }
    logger.debug(`Resolved config for environment: "${env}"`);
    return config;
  }
  return envMap;
}

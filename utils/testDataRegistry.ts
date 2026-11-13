import fs from 'node:fs';
import path from 'node:path';
import { APP_ENVIRONMENTS, type AppEnvironment } from '../config/env';
import { Logger } from './logger';

const logger = new Logger('TestDataRegistry');

type DataRecord = Record<string, unknown>;
type DataSource = Record<string, unknown>;

export interface TestDataRegistryConfig {
  /** Directory to scan for .json data files. Defaults to `test-data/` in cwd. */
  dataDir?: string;
}

/**
 * Named JSON data sources (one per file in `test-data/`, the file name is the source name).
 * A source is either flat (`{ key: {...} }`) or environment-scoped (`{ prod: { key: {...} }, local: {...} }`).
 */
export class TestDataRegistry {
  private readonly dataDir: string;
  private sources: Record<string, DataSource> = {};
  private pendingFiles = new Map<string, string>();
  private loaded = false;

  constructor(config: TestDataRegistryConfig = {}) {
    this.dataDir = config.dataDir ?? path.resolve(process.cwd(), 'test-data');
  }

  /**
   * Registers a JSON file outside `dataDir` as a named data source.
   * The file is read lazily on first resolve() call.
   */
  addFile(name: string, filePath: string): this {
    this.pendingFiles.set(name, filePath);
    return this;
  }

  /**
   * Resolves a key from a named source.
   * Throws descriptive errors for missing sources or keys.
   */
  resolve(source: string, key: string, environment: AppEnvironment): DataRecord {
    const data = this.scopedSource(source, environment);

    if (!(key in data)) {
      throw new Error(
        `[TestDataRegistry] Key "${key}" not found in source "${source}". Available keys: ${Object.keys(data).join(', ')}`,
      );
    }

    const value = data[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`[TestDataRegistry] Key "${key}" in source "${source}" must contain an object.`);
    }

    return value as DataRecord;
  }

  /**
   * Resolves multiple source:key pairs at once.
   * @param keys - e.g. { event: 'conference', booking: 'validCustomer' }
   * @returns Resolved data keyed by source name
   */
  resolveAll(keys: Record<string, string>, environment: AppEnvironment): Record<string, DataRecord> {
    const resolved: Record<string, DataRecord> = {};
    for (const [source, key] of Object.entries(keys)) {
      resolved[source] = this.resolve(source, key, environment);
    }
    return resolved;
  }

  /** Returns every key of a source for the environment, e.g. the accounts of the user pool. */
  keys(source: string, environment: AppEnvironment): string[] {
    return Object.keys(this.scopedSource(source, environment));
  }

  /** Returns all available source names. */
  get availableSources(): string[] {
    this.ensureLoaded();
    return Object.keys(this.sources);
  }

  private scopedSource(source: string, environment: AppEnvironment): DataSource {
    this.ensureLoaded();

    const sourceData = this.sources[source];
    if (!sourceData) {
      throw new Error(
        `[TestDataRegistry] Source "${source}" not found. Available sources: ${Object.keys(this.sources).join(', ')}`,
      );
    }

    const isEnvironmentScoped = APP_ENVIRONMENTS.some((name) => Object.prototype.hasOwnProperty.call(sourceData, name));
    const selectedData = isEnvironmentScoped ? sourceData[environment] : sourceData;

    if (!selectedData || typeof selectedData !== 'object' || Array.isArray(selectedData)) {
      throw new Error(
        `[TestDataRegistry] Environment "${environment}" not found in source "${source}". Available environments: ${Object.keys(sourceData).join(', ')}`,
      );
    }
    return selectedData as DataSource;
  }

  private ensureLoaded(): void {
    if (this.loaded) return;

    for (const [name, filePath] of this.pendingFiles) {
      const resolved = path.resolve(filePath);
      if (fs.existsSync(resolved)) {
        this.sources[name] = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        logger.debug(`Loaded data source "${name}" from ${resolved}`);
      } else {
        logger.warn(`Data source file not found: ${resolved} (source: "${name}")`);
      }
    }

    if (fs.existsSync(this.dataDir)) {
      for (const file of fs.readdirSync(this.dataDir)) {
        if (!file.endsWith('.json')) continue;
        const name = file.replace('.json', '');
        if (!this.sources[name]) {
          const filePath = path.join(this.dataDir, file);
          this.sources[name] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          logger.debug(`Loaded data source "${name}" from ${filePath}`);
        }
      }
    } else {
      logger.warn(`Test data directory not found: ${this.dataDir}`);
    }

    this.loaded = true;
    logger.info(`Data registry loaded: ${Object.keys(this.sources).join(', ')}`);
  }
}

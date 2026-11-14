import fs from 'node:fs';
import path from 'node:path';

export interface StorageStateManagerConfig {
  /** Directory of the session files. Defaults to `.auth` in the working directory. */
  authDir?: string;
  /** A session file older than this is logged in again. Defaults to 12 hours (the app's token lives longer). */
  maxAgeMs?: number;
  /** How long a worker waits for another worker's login, and after which a left-over lock counts as stale. */
  lockTimeoutMs?: number;
}

/**
 * Session files (`.auth/<name>.json`) shared by every worker and project of a run, and reused by later runs while fresh.
 * A file lock makes sure only one worker logs a given account in; the others wait for its file.
 */
export class StorageStateManager {
  private readonly authDir: string;
  private readonly maxAgeMs: number;
  private readonly lockTimeoutMs: number;

  constructor(config: StorageStateManagerConfig = {}) {
    this.authDir = config.authDir ?? path.resolve(process.cwd(), '.auth');
    this.maxAgeMs = config.maxAgeMs ?? 12 * 60 * 60 * 1000;
    this.lockTimeoutMs = config.lockTimeoutMs ?? 60_000;
    fs.mkdirSync(this.authDir, { recursive: true });
  }

  pathFor(name: string): string {
    return path.join(this.authDir, `${name}.json`);
  }

  isFresh(name: string): boolean {
    const file = this.pathFor(name);
    return fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < this.maxAgeMs;
  }

  /**
   * Returns the session file of `name`, calling `login(tmpPath)` to create it only when it is missing or stale.
   * `login` must save the storage state to the path it is given; the file is renamed into place so no reader sees it half-written.
   */
  async ensure(name: string, login: (filePath: string) => Promise<void>): Promise<string> {
    const file = this.pathFor(name);
    while (!this.isFresh(name)) {
      if (this.tryLock(name)) {
        try {
          if (!this.isFresh(name)) {
            const tmp = `${file}.${process.pid}.tmp`;
            await login(tmp);
            fs.renameSync(tmp, file);
          }
        } finally {
          this.releaseLock(name);
        }
      } else {
        await this.waitForUnlock(name);
      }
    }
    return file;
  }

  private lockPath(name: string): string {
    return `${this.pathFor(name)}.lock`;
  }

  private tryLock(name: string): boolean {
    const lock = this.lockPath(name);
    try {
      fs.closeSync(fs.openSync(lock, 'wx'));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      // A worker that crashed mid-login leaves its lock behind
      if (Date.now() - fs.statSync(lock).mtimeMs > this.lockTimeoutMs) {
        fs.rmSync(lock, { force: true });
      }
      return false;
    }
  }

  private releaseLock(name: string): void {
    fs.rmSync(this.lockPath(name), { force: true });
  }

  private async waitForUnlock(name: string): Promise<void> {
    const started = Date.now();
    while (fs.existsSync(this.lockPath(name))) {
      if (Date.now() - started > this.lockTimeoutMs) {
        throw new Error(`Timed out after ${this.lockTimeoutMs}ms waiting for another worker to log "${name}" in`);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

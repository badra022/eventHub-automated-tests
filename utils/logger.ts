import winston from 'winston';
import { Encryptor, isEncrypted } from './crypto';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevel;

/** Meta keys whose values are personal data or credentials; they are never written in plain text. */
const SENSITIVE_KEY = /pass(word)?|token|authorization|cookie|secret|e-?mail|phone|customerName/i;
const MAX_DEPTH = 8;

const rootLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, module, durationMs, ...meta }) => {
      // Set by Playwright in worker processes; tells parallel workers' lines apart
      const worker = process.env.TEST_PARALLEL_INDEX;
      const prefix = `${worker !== undefined ? `[w${worker}]` : ''}${module ? `[${module}]` : ''}`;
      const duration = durationMs != null ? ` (${durationMs}ms)` : '';
      const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}${duration}${extra}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

let encryptor: Encryptor | null | undefined;

function protect(value: unknown): string {
  if (isEncrypted(value)) return value;
  if (encryptor === undefined) {
    encryptor = process.env.TEST_DATA_KEY ? new Encryptor(process.env.TEST_DATA_KEY) : null;
  }
  return encryptor ? encryptor.encrypt(typeof value === 'string' ? value : JSON.stringify(value)) : '***';
}

/**
 * Makes a value safe and readable in logs: sensitive keys are encrypted (decrypt with `npm run secret:decrypt`),
 * or masked when TEST_DATA_KEY is not set; Errors keep their name, message and stack.
 */
export function toLoggable(value: unknown, key = '', depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (key && SENSITIVE_KEY.test(key) && value !== '') return protect(value);
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (depth >= MAX_DEPTH || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => toLoggable(item, '', depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toLoggable(v, k, depth + 1)]));
}

export class Logger {
  private child: winston.Logger;

  constructor(module: string) {
    this.child = rootLogger.child({ module });
  }

  /** Use around expensive debug dumps (e.g. reading a response body) so they only run when debug is on. */
  isDebugEnabled(): boolean {
    return rootLogger.isDebugEnabled();
  }

  /** Step-by-step progress and successful actions. */
  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  /** Unexpected paths that may break something but do not fail on their own. */
  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  /** Failures; pass the caught error as `meta.error`. */
  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }

  /** Variable and object dumps (requests, responses, payloads); sensitive fields are encrypted. */
  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }

  timed(message: string): (endMessage?: string) => void {
    const start = performance.now();
    return (endMessage?: string) => {
      const durationMs = Math.round(performance.now() - start);
      this.child.info(endMessage ?? message, { durationMs });
    };
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (!rootLogger.isLevelEnabled(level)) return;
    this.child.log(level, message, meta ? (toLoggable(meta) as Record<string, unknown>) : undefined);
  }
}

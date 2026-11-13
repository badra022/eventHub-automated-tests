import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info') as LogLevel;

const rootLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, module, durationMs, ...meta }) => {
      const prefix = module ? `[${module}]` : '';
      const duration = durationMs != null ? ` (${durationMs}ms)` : '';
      const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}${duration}${extra}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

export class Logger {
  private child: winston.Logger;

  constructor(module: string) {
    this.child = rootLogger.child({ module });
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.child.info(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.child.warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.child.error(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.child.debug(message, meta);
  }

  timed(message: string): (endMessage?: string) => void {
    const start = performance.now();
    return (endMessage?: string) => {
      const durationMs = Math.round(performance.now() - start);
      this.child.info(endMessage ?? message, { durationMs });
    };
  }
}

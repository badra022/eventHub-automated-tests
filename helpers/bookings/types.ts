import type { Logger } from '../../utils/logger';

export type HelperLogger = Pick<Logger, 'info' | 'debug' | 'warn' | 'error'>;

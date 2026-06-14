import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

export type { Logger } from 'pino';

/**
 * Creates a sub-logger with bound context (e.g., execution_id, service_name).
 * Essential for traceability across the distributed system.
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

export * from './runtime-logger';

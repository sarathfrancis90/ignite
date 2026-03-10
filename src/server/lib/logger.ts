import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const redactPaths = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
];

const baseConfig: pino.LoggerOptions = {
  name: "ignite-app",
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  base: {
    service: "ignite-app",
    env: process.env.NODE_ENV ?? "development",
  },
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
};

const transportConfig: pino.TransportSingleOptions | undefined = isProduction
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };

export const logger: pino.Logger = transportConfig
  ? pino(baseConfig, pino.transport(transportConfig))
  : pino(baseConfig);

export type Logger = pino.Logger;

interface ChildLoggerContext {
  requestId?: string;
  correlationId?: string;
  service?: string;
  userId?: string;
  procedure?: string;
  [key: string]: unknown;
}

/**
 * Create a child logger with additional context.
 * Useful for per-request or per-service logging.
 */
export function createChildLogger(context: ChildLoggerContext): Logger {
  return logger.child(context);
}

/**
 * Create a request-scoped logger with correlationId, userId, and procedure.
 * Used by tRPC middleware to ensure all errors are logged with context.
 */
export function createRequestLogger(opts: {
  correlationId: string;
  userId?: string;
  procedure?: string;
}): Logger {
  return logger.child({
    correlationId: opts.correlationId,
    userId: opts.userId,
    procedure: opts.procedure,
    service: "trpc",
  });
}

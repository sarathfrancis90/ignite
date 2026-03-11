import { type ConnectionOptions } from "bullmq";
import { logger } from "./logger";

const childLogger = logger.child({ service: "queue-connection" });

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL;
}

export function getQueueConnection(): ConnectionOptions | undefined {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    childLogger.warn("REDIS_URL not configured — BullMQ queues disabled");
    return undefined;
  }

  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
    };
  } catch {
    childLogger.error("Invalid REDIS_URL format — BullMQ queues disabled");
    return undefined;
  }
}

export function isQueueAvailable(): boolean {
  return !!getRedisUrl();
}

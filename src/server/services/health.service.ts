import { prisma } from "@/server/lib/prisma";
import { isRedisAvailable, cacheGet, cacheSet } from "@/server/lib/redis";
import { createChildLogger } from "@/server/lib/logger";

const healthLogger = createChildLogger({ service: "health" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubCheckResult {
  status: "ok" | "error" | "skipped";
  latency_ms?: number;
  error?: string;
}

interface MemoryInfo {
  heap_used_bytes: number;
  heap_total_bytes: number;
  rss_bytes: number;
  heap_used_mb: number;
  heap_total_mb: number;
}

interface CpuInfo {
  user_ms: number;
  system_ms: number;
}

export interface HealthCheckResult {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  response_time_ms: number;
  memory: MemoryInfo;
  cpu: CpuInfo;
  checks: {
    database: SubCheckResult;
    redis: SubCheckResult;
    s3: SubCheckResult;
  };
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

export async function checkDatabase(): Promise<SubCheckResult> {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency_ms = Math.round(performance.now() - start);
    healthLogger.debug({ latency_ms }, "Database check passed");
    return { status: "ok", latency_ms };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Database connection failed";
    healthLogger.warn({ error }, "Database check failed");
    return { status: "error", error };
  }
}

export async function checkRedis(): Promise<SubCheckResult> {
  if (!isRedisAvailable()) {
    return { status: "skipped" };
  }

  try {
    const start = performance.now();
    // Write and read a health-check key to verify Redis connectivity
    const healthKey = "health:ping";
    await cacheSet(healthKey, "pong", 10);
    const value = await cacheGet(healthKey);
    const latency_ms = Math.round(performance.now() - start);

    if (value !== "pong") {
      return { status: "error", latency_ms, error: "Redis read/write mismatch" };
    }

    healthLogger.debug({ latency_ms }, "Redis check passed");
    return { status: "ok", latency_ms };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Redis connection failed";
    healthLogger.warn({ error }, "Redis check failed");
    return { status: "error", error };
  }
}

export async function checkS3(): Promise<SubCheckResult> {
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3Bucket = process.env.S3_BUCKET;

  if (!s3Endpoint || !s3Bucket) {
    return { status: "skipped" };
  }

  try {
    const start = performance.now();
    const url = `${s3Endpoint}/${s3Bucket}`;
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const latency_ms = Math.round(performance.now() - start);

    // S3-compatible stores return 200, 403 (valid bucket, no list perms), or 404
    if (response.status === 404) {
      return { status: "error", latency_ms, error: "S3 bucket not found" };
    }

    healthLogger.debug({ latency_ms, statusCode: response.status }, "S3 check passed");
    return { status: "ok", latency_ms };
  } catch (e) {
    const error = e instanceof Error ? e.message : "S3 connection failed";
    healthLogger.warn({ error }, "S3 check failed");
    return { status: "error", error };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMemoryInfo(): MemoryInfo {
  const mem = process.memoryUsage();
  return {
    heap_used_bytes: mem.heapUsed,
    heap_total_bytes: mem.heapTotal,
    rss_bytes: mem.rss,
    heap_used_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heap_total_mb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };
}

function getCpuInfo(): CpuInfo {
  const cpu = process.cpuUsage();
  return {
    user_ms: Math.round(cpu.user / 1000),
    system_ms: Math.round(cpu.system / 1000),
  };
}

function deriveOverallStatus(checks: HealthCheckResult["checks"]): "ok" | "degraded" | "error" {
  const { database, redis, s3 } = checks;

  // Database is critical — if it's down, we're in error
  if (database.status === "error") {
    return "error";
  }

  // If any non-skipped optional service is down, degraded
  if (redis.status === "error" || s3.status === "error") {
    return "degraded";
  }

  return "ok";
}

// ---------------------------------------------------------------------------
// Main health check
// ---------------------------------------------------------------------------

export async function performHealthCheck(): Promise<HealthCheckResult> {
  const overallStart = performance.now();

  // Run all checks concurrently
  const [database, redis, s3] = await Promise.all([checkDatabase(), checkRedis(), checkS3()]);

  const checks = { database, redis, s3 };
  const status = deriveOverallStatus(checks);
  const response_time_ms = Math.round(performance.now() - overallStart);

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "0.1.0",
    response_time_ms,
    memory: getMemoryInfo(),
    cpu: getCpuInfo(),
    checks,
  };

  healthLogger.info(
    {
      status,
      response_time_ms,
      db_status: database.status,
      redis_status: redis.status,
      s3_status: s3.status,
    },
    "Health check completed",
  );

  return result;
}

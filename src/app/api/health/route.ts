import { NextResponse } from "next/server";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/server/lib/prisma";
import { redis } from "@/server/lib/redis";
import { s3 } from "@/server/lib/s3";
import {
  logger,
  generateCorrelationId,
  withCorrelation,
} from "@/server/lib/logger";

interface ServiceStatus {
  status: "healthy" | "unhealthy";
  latencyMs: number;
  error?: string;
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = performance.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - start),
      error: message,
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const start = performance.now();
  try {
    const result = await redis.ping();
    if (result !== "PONG") {
      return {
        status: "unhealthy",
        latencyMs: Math.round(performance.now() - start),
        error: "Unexpected PING response",
      };
    }
    return {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - start),
      error: message,
    };
  }
}

async function checkS3(): Promise<ServiceStatus> {
  const start = performance.now();
  const bucket = process.env.S3_BUCKET ?? "ignite-uploads";
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return {
      status: "healthy",
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      status: "unhealthy",
      latencyMs: Math.round(performance.now() - start),
      error: message,
    };
  }
}

export async function GET(): Promise<NextResponse> {
  const correlationId = generateCorrelationId();
  const startTime = performance.now();

  logger.info("Health check started", withCorrelation(correlationId));

  const [database, redisStatus, s3Status] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkS3(),
  ]);

  const overall =
    database.status === "healthy" &&
    redisStatus.status === "healthy" &&
    s3Status.status === "healthy"
      ? "healthy"
      : "degraded";

  const totalLatencyMs = Math.round(performance.now() - startTime);

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    correlationId,
    totalLatencyMs,
    services: {
      database,
      redis: redisStatus,
      s3: s3Status,
    },
  };

  const statusCode = overall === "healthy" ? 200 : 503;

  logger.info(
    "Health check completed",
    withCorrelation(correlationId, {
      status: overall,
      totalLatencyMs,
      procedure: "healthCheck",
    }),
  );

  return NextResponse.json(body, { status: statusCode });
}

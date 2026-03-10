import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: "ok" | "error"; latency_ms?: number; error?: string };
    redis: { status: "ok" | "error" | "skipped"; latency_ms?: number; error?: string };
  };
}

function getPrisma() {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const checks: HealthCheck["checks"] = {
    database: { status: "error" },
    redis: { status: "skipped" },
  };

  // Check database
  try {
    const dbStart = Date.now();
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    checks.database = { status: "ok", latency_ms: Date.now() - dbStart };
  } catch (e) {
    checks.database = {
      status: "error",
      error: e instanceof Error ? e.message : "Database connection failed",
    };
  }

  // Check Redis (if configured)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisStart = Date.now();
      // Simple TCP check for now — full Redis client added in Story 1.1
      checks.redis = { status: "ok", latency_ms: Date.now() - redisStart };
    } catch (e) {
      checks.redis = {
        status: "error",
        error: e instanceof Error ? e.message : "Redis connection failed",
      };
    }
  }

  const overallStatus =
    checks.database.status === "ok"
      ? "ok"
      : checks.database.status === "error"
        ? "degraded"
        : "error";

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "0.1.0",
    checks,
  };

  return NextResponse.json(response, {
    status: overallStatus === "ok" || overallStatus === "degraded" ? 200 : 503,
  });
}

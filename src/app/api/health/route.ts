import { NextResponse } from "next/server";
import { performHealthCheck } from "@/server/services/health.service";
import type { HealthCheckResult } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const result = await performHealthCheck();

  const httpStatus = result.status === "error" ? 503 : 200;

  return NextResponse.json(result, { status: httpStatus });
}

import { NextResponse } from "next/server";
import { register } from "@/server/lib/metrics";
import {
  logger,
  generateCorrelationId,
  withCorrelation,
} from "@/server/lib/logger";

export async function GET(): Promise<NextResponse> {
  const correlationId = generateCorrelationId();

  try {
    const metrics = await register.metrics();

    logger.debug("Metrics endpoint scraped", withCorrelation(correlationId));

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      "Failed to collect metrics",
      withCorrelation(correlationId, {
        error: message,
        procedure: "metricsCollection",
      }),
    );

    return NextResponse.json(
      { error: "Failed to collect metrics", correlationId },
      { status: 500 },
    );
  }
}

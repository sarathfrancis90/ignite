import { type NextRequest, NextResponse } from "next/server";
import { createChildLogger, type Logger } from "./logger";
import { recordHttpRequest, incrementErrors } from "./metrics-store";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> },
) => Promise<NextResponse>;

interface RequestLogData {
  method: string;
  path: string;
  statusCode: number;
  duration_ms: number;
  user_agent: string | null;
  ip: string | null;
  correlationId: string;
}

function generateCorrelationId(): string {
  return crypto.randomUUID();
}

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/**
 * Wraps a Next.js API route handler with structured request logging.
 * Assigns a unique correlation ID, logs method/path/status/duration,
 * and records HTTP metrics for Prometheus.
 */
export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string> },
  ): Promise<NextResponse> => {
    const existingCorrelationId =
      request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id");
    const correlationId = existingCorrelationId ?? generateCorrelationId();
    const start = performance.now();

    const requestLogger: Logger = createChildLogger({
      correlationId,
      service: "http",
    });

    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    requestLogger.info({ method, path }, "Incoming request");

    let response: NextResponse;
    try {
      response = await handler(request, context);
    } catch (error: unknown) {
      const duration_ms = Math.round(performance.now() - start);
      const durationSeconds = duration_ms / 1000;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      requestLogger.error(
        {
          method,
          path,
          duration_ms,
          error: errorMessage,
          correlationId,
        },
        "Request failed with unhandled error",
      );

      recordHttpRequest(method, path, 500, durationSeconds);
      incrementErrors("http");

      response = NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

    const duration_ms = Math.round(performance.now() - start);
    const durationSeconds = duration_ms / 1000;
    const statusCode = response.status;
    const user_agent = request.headers.get("user-agent");
    const ip = getClientIp(request);

    recordHttpRequest(method, path, statusCode, durationSeconds);

    if (statusCode >= 500) {
      incrementErrors("http");
    }

    const logData: RequestLogData = {
      method,
      path,
      statusCode,
      duration_ms,
      user_agent,
      ip,
      correlationId,
    };

    if (statusCode >= 500) {
      requestLogger.error(logData, "Request completed with server error");
    } else if (statusCode >= 400) {
      requestLogger.warn(logData, "Request completed with client error");
    } else {
      requestLogger.info(logData, "Request completed");
    }

    response.headers.set("x-correlation-id", correlationId);

    return response;
  };
}

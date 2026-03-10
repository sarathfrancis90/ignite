import { describe, it, expect } from "vitest";
import { logger, createChildLogger, createRequestLogger } from "./logger";

describe("logger", () => {
  it("exports a pino logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
  });

  it("has the correct name", () => {
    expect(logger.bindings().service).toBe("ignite-app");
  });

  it("creates child loggers with context", () => {
    const child = createChildLogger({ service: "test-service", requestId: "abc-123" });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
    const bindings = child.bindings();
    expect(bindings.service).toBe("test-service");
    expect(bindings.requestId).toBe("abc-123");
  });

  it("creates request loggers with correlationId", () => {
    const reqLogger = createRequestLogger({
      correlationId: "corr-123",
      userId: "user-456",
      procedure: "admin.listUsers",
    });
    expect(reqLogger).toBeDefined();
    const bindings = reqLogger.bindings();
    expect(bindings.correlationId).toBe("corr-123");
    expect(bindings.userId).toBe("user-456");
    expect(bindings.procedure).toBe("admin.listUsers");
    expect(bindings.service).toBe("trpc");
  });

  it("creates request loggers without optional fields", () => {
    const reqLogger = createRequestLogger({
      correlationId: "corr-789",
    });
    const bindings = reqLogger.bindings();
    expect(bindings.correlationId).toBe("corr-789");
    expect(bindings.userId).toBeUndefined();
    expect(bindings.procedure).toBeUndefined();
  });
});

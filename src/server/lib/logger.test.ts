import { describe, it, expect } from "vitest";
import { logger, createChildLogger } from "./logger";

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
});

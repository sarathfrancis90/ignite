import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger, generateCorrelationId, withCorrelation } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should output JSON to stdout for info messages", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    logger.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.key).toBe("value");
    expect(parsed.timestamp).toBeDefined();
  });

  it("should output JSON to stderr for error messages", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    logger.error("error message", { error: "something failed" });

    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());

    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("error message");
    expect(parsed.error).toBe("something failed");
  });

  it("should include correlationId when using withCorrelation", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    logger.info("correlated", withCorrelation("abc-123", { userId: "user1" }));

    const output = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.trim());

    expect(parsed.correlationId).toBe("abc-123");
    expect(parsed.userId).toBe("user1");
  });
});

describe("generateCorrelationId", () => {
  it("should return a valid UUID", () => {
    const id = generateCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should return unique IDs", () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).not.toBe(id2);
  });
});

describe("withCorrelation", () => {
  it("should merge correlationId with meta", () => {
    const result = withCorrelation("test-id", { foo: "bar" });
    expect(result).toEqual({ correlationId: "test-id", foo: "bar" });
  });

  it("should work without additional meta", () => {
    const result = withCorrelation("test-id");
    expect(result).toEqual({ correlationId: "test-id" });
  });
});

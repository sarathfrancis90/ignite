import { describe, it, expect } from "vitest";
import {
  register,
  httpRequestDuration,
  httpRequestErrors,
  activeConnections,
  jobQueueDepth,
} from "../metrics";

describe("metrics", () => {
  it("should export a Prometheus registry", () => {
    expect(register).toBeDefined();
    expect(typeof register.metrics).toBe("function");
    expect(typeof register.contentType).toBe("string");
  });

  it("should produce valid Prometheus text output", async () => {
    const output = await register.metrics();
    expect(output).toContain("# HELP");
    expect(output).toContain("# TYPE");
  });

  it("should register httpRequestDuration histogram", async () => {
    httpRequestDuration.observe(
      { method: "GET", route: "/test", status_code: "200" },
      0.1,
    );
    const output = await register.metrics();
    expect(output).toContain("http_request_duration_seconds");
  });

  it("should register httpRequestErrors counter", async () => {
    httpRequestErrors.inc({
      method: "GET",
      route: "/test",
      status_code: "500",
    });
    const output = await register.metrics();
    expect(output).toContain("http_request_errors_total");
  });

  it("should register activeConnections gauge", async () => {
    activeConnections.set(5);
    const output = await register.metrics();
    expect(output).toContain("active_connections");
  });

  it("should register jobQueueDepth gauge", async () => {
    jobQueueDepth.set({ queue_name: "email" }, 10);
    const output = await register.metrics();
    expect(output).toContain("job_queue_depth");
  });

  it("should include default Node.js metrics", async () => {
    const output = await register.metrics();
    expect(output).toContain("nodejs_");
  });

  it("should include app label", async () => {
    const output = await register.metrics();
    expect(output).toContain('app="ignite"');
  });
});

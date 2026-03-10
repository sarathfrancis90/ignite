import { describe, it, expect } from "vitest";
import {
  incrementCounter,
  setGauge,
  observeHistogram,
  getMetricsOutput,
  recordHttpRequest,
  recordDbQuery,
  setActiveConnections,
  incrementErrors,
  observeNodeMetrics,
} from "./metrics-store";

// The metrics store uses module-level Maps, so we test against accumulated state.
// Each test adds unique metric names to avoid interference.

describe("metrics-store", () => {
  describe("incrementCounter", () => {
    it("creates and increments a counter", () => {
      incrementCounter("test_counter_1", "A test counter", {}, 1);
      incrementCounter("test_counter_1", "A test counter", {}, 2);

      const output = getMetricsOutput();
      expect(output).toContain("# HELP test_counter_1 A test counter");
      expect(output).toContain("# TYPE test_counter_1 counter");
      expect(output).toContain("test_counter_1 3");
    });

    it("tracks separate label combinations", () => {
      incrementCounter("test_counter_labels", "Counter with labels", { method: "GET" });
      incrementCounter("test_counter_labels", "Counter with labels", { method: "POST" });
      incrementCounter("test_counter_labels", "Counter with labels", { method: "GET" });

      const output = getMetricsOutput();
      expect(output).toContain('test_counter_labels{method="GET"} 2');
      expect(output).toContain('test_counter_labels{method="POST"} 1');
    });
  });

  describe("setGauge", () => {
    it("sets and overwrites gauge values", () => {
      setGauge("test_gauge_1", "A test gauge", 42);
      setGauge("test_gauge_1", "A test gauge", 99);

      const output = getMetricsOutput();
      expect(output).toContain("# TYPE test_gauge_1 gauge");
      expect(output).toContain("test_gauge_1 99");
    });
  });

  describe("observeHistogram", () => {
    it("records histogram observations", () => {
      observeHistogram("test_hist_1", "A test histogram", 0.05);
      observeHistogram("test_hist_1", "A test histogram", 0.5);

      const output = getMetricsOutput();
      expect(output).toContain("# TYPE test_hist_1 histogram");
      expect(output).toContain("test_hist_1_count 2");
      expect(output).toContain("test_hist_1_sum");
      expect(output).toContain('test_hist_1_bucket{le="+Inf"} 2');
    });
  });

  describe("convenience wrappers", () => {
    it("recordHttpRequest records counter and histogram", () => {
      recordHttpRequest("GET", "/api/test", 200, 0.15);

      const output = getMetricsOutput();
      expect(output).toContain("ignite_http_requests_total");
      expect(output).toContain("ignite_http_request_duration_seconds");
    });

    it("recordDbQuery records histogram", () => {
      recordDbQuery(0.025);

      const output = getMetricsOutput();
      expect(output).toContain("ignite_db_query_duration_seconds");
    });

    it("setActiveConnections sets gauge", () => {
      setActiveConnections(10);

      const output = getMetricsOutput();
      expect(output).toContain("ignite_active_connections 10");
    });

    it("incrementErrors increments counter with type label", () => {
      incrementErrors("http");

      const output = getMetricsOutput();
      expect(output).toContain("ignite_errors_total");
      expect(output).toContain('type="http"');
    });
  });

  describe("getMetricsOutput", () => {
    it("includes uptime metrics", () => {
      const output = getMetricsOutput();
      expect(output).toContain("ignite_up 1");
      expect(output).toContain("ignite_uptime_seconds");
    });

    it("returns valid Prometheus text format", () => {
      const output = getMetricsOutput();
      // Every HELP line should be followed by a TYPE line
      const lines = output.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]?.startsWith("# HELP")) {
          expect(lines[i + 1]).toMatch(/^# TYPE/);
        }
      }
    });
  });

  describe("observeNodeMetrics", () => {
    it("records Node.js heap metrics", () => {
      observeNodeMetrics();

      const output = getMetricsOutput();
      expect(output).toContain("nodejs_heap_bytes");
      expect(output).toContain("nodejs_event_loop_lag_seconds");
    });
  });
});

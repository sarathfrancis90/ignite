import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { vi } from "vitest";

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { getQueueConnection, isQueueAvailable } from "./queue-connection";

describe("queue-connection", () => {
  let originalRedisUrl: string | undefined;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
  });

  afterEach(() => {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  });

  describe("getQueueConnection", () => {
    it("returns undefined when REDIS_URL is not set", () => {
      delete process.env.REDIS_URL;
      expect(getQueueConnection()).toBeUndefined();
    });

    it("parses a valid Redis URL", () => {
      process.env.REDIS_URL = "redis://user:pass@redis.example.com:6380";
      const conn = getQueueConnection();
      expect(conn).toEqual({
        host: "redis.example.com",
        port: 6380,
        password: "pass",
        username: "user",
      });
    });

    it("uses default port 6379 when not specified", () => {
      process.env.REDIS_URL = "redis://localhost";
      const conn = getQueueConnection();
      expect(conn).toEqual(expect.objectContaining({ host: "localhost", port: 6379 }));
    });

    it("returns undefined for an invalid URL format", () => {
      process.env.REDIS_URL = "not-a-valid-url";
      expect(getQueueConnection()).toBeUndefined();
    });
  });

  describe("isQueueAvailable", () => {
    it("returns false when REDIS_URL is not set", () => {
      delete process.env.REDIS_URL;
      expect(isQueueAvailable()).toBe(false);
    });

    it("returns true when REDIS_URL is set", () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      expect(isQueueAvailable()).toBe(true);
    });
  });
});

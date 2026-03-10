import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkDatabase, checkRedis, checkS3, performHealthCheck } from "./health.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/server/lib/redis", () => ({
  isRedisAvailable: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
  createChildLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

const { prisma } = await import("@/server/lib/prisma");
const { isRedisAvailable, cacheGet, cacheSet } = await import("@/server/lib/redis");

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.S3_ENDPOINT;
  delete process.env.S3_BUCKET;
});

describe("checkDatabase", () => {
  it("returns ok when database is reachable", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);

    const result = await checkDatabase();
    expect(result.status).toBe("ok");
    expect(result.latency_ms).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("returns error when database is unreachable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const result = await checkDatabase();
    expect(result.status).toBe("error");
    expect(result.error).toBe("Connection refused");
  });
});

describe("checkRedis", () => {
  it("returns skipped when Redis is not available", async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(false);

    const result = await checkRedis();
    expect(result.status).toBe("skipped");
  });

  it("returns ok when Redis is available and responds", async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(cacheSet).mockResolvedValue(undefined);
    vi.mocked(cacheGet).mockResolvedValue("pong");

    const result = await checkRedis();
    expect(result.status).toBe("ok");
    expect(result.latency_ms).toBeDefined();
  });

  it("returns error when Redis read/write mismatch", async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(cacheSet).mockResolvedValue(undefined);
    vi.mocked(cacheGet).mockResolvedValue(null);

    const result = await checkRedis();
    expect(result.status).toBe("error");
    expect(result.error).toBe("Redis read/write mismatch");
  });

  it("returns error when Redis throws", async () => {
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(cacheSet).mockRejectedValue(new Error("Redis timeout"));

    const result = await checkRedis();
    expect(result.status).toBe("error");
    expect(result.error).toBe("Redis timeout");
  });
});

describe("checkS3", () => {
  it("returns skipped when S3 is not configured", async () => {
    const result = await checkS3();
    expect(result.status).toBe("skipped");
  });

  it("returns ok when S3 endpoint responds", async () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "test-bucket";

    const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await checkS3();
    expect(result.status).toBe("ok");
    expect(result.latency_ms).toBeDefined();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:9000/test-bucket",
      expect.objectContaining({ method: "HEAD" }),
    );

    vi.unstubAllGlobals();
  });

  it("returns ok when S3 returns 403 (valid bucket, no list perms)", async () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "test-bucket";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403 }));

    const result = await checkS3();
    expect(result.status).toBe("ok");

    vi.unstubAllGlobals();
  });

  it("returns error when S3 bucket not found", async () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "nonexistent";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404 }));

    const result = await checkS3();
    expect(result.status).toBe("error");
    expect(result.error).toBe("S3 bucket not found");

    vi.unstubAllGlobals();
  });

  it("returns error when S3 endpoint is unreachable", async () => {
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "test-bucket";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const result = await checkS3();
    expect(result.status).toBe("error");
    expect(result.error).toBe("ECONNREFUSED");

    vi.unstubAllGlobals();
  });
});

describe("performHealthCheck", () => {
  it("returns ok when all checks pass", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(isRedisAvailable).mockReturnValue(false);

    const result = await performHealthCheck();
    expect(result.status).toBe("ok");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.redis.status).toBe("skipped");
    expect(result.checks.s3.status).toBe("skipped");
    expect(result.timestamp).toBeDefined();
    expect(result.uptime).toBeGreaterThan(0);
    expect(result.version).toBeDefined();
    expect(result.memory).toBeDefined();
    expect(result.cpu).toBeDefined();
  });

  it("returns error when database is down", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("DB down"));
    vi.mocked(isRedisAvailable).mockReturnValue(false);

    const result = await performHealthCheck();
    expect(result.status).toBe("error");
    expect(result.checks.database.status).toBe("error");
  });

  it("returns degraded when optional service is down", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(isRedisAvailable).mockReturnValue(true);
    vi.mocked(cacheSet).mockRejectedValue(new Error("Redis down"));

    const result = await performHealthCheck();
    expect(result.status).toBe("degraded");
    expect(result.checks.database.status).toBe("ok");
    expect(result.checks.redis.status).toBe("error");
  });

  it("includes memory and cpu info", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(isRedisAvailable).mockReturnValue(false);

    const result = await performHealthCheck();
    expect(result.memory.heap_used_bytes).toBeGreaterThan(0);
    expect(result.memory.heap_total_bytes).toBeGreaterThan(0);
    expect(result.memory.rss_bytes).toBeGreaterThan(0);
    expect(result.cpu.user_ms).toBeGreaterThanOrEqual(0);
    expect(result.cpu.system_ms).toBeGreaterThanOrEqual(0);
  });
});

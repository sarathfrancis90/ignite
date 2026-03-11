import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "job_1" }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("@/server/lib/queue-connection", () => ({
  getQueueConnection: vi.fn().mockReturnValue({ host: "localhost", port: 6379 }),
  isQueueAvailable: vi.fn().mockReturnValue(true),
}));

vi.mock("@/server/services/email.service", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/services/email-templates", () => ({
  renderNotificationEmail: vi.fn().mockReturnValue({
    subject: "[Ignite] Test",
    html: "<p>Test</p>",
    text: "Test",
  }),
  renderDigestEmail: vi.fn().mockReturnValue({
    subject: "[Ignite] Your Daily Digest",
    html: "<p>Digest</p>",
    text: "Digest",
  }),
}));

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import {
  getEmailQueue,
  enqueueImmediateEmail,
  setupDigestSchedules,
  startEmailWorker,
  closeEmailQueue,
} from "./email.queue";
import { Queue } from "bullmq";

describe("email.queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEmailQueue", () => {
    it("creates and returns a queue instance", () => {
      const queue = getEmailQueue();
      expect(queue).not.toBeNull();
      expect(Queue).toHaveBeenCalledWith(
        "email",
        expect.objectContaining({
          connection: { host: "localhost", port: 6379 },
        }),
      );
    });

    it("returns the same instance on subsequent calls", () => {
      const q1 = getEmailQueue();
      const q2 = getEmailQueue();
      expect(q1).toBe(q2);
    });
  });

  describe("enqueueImmediateEmail", () => {
    it("adds an immediate email job to the queue", async () => {
      await closeEmailQueue();
      await enqueueImmediateEmail({
        notificationId: "notif_1",
        userId: "user_1",
        notificationType: "IDEA_SUBMITTED",
        title: "Test",
        body: "Test body",
      });

      const queue = getEmailQueue();
      expect(queue?.add).toHaveBeenCalledWith(
        "immediate-email",
        expect.objectContaining({
          type: "immediate",
          userId: "user_1",
          notificationType: "IDEA_SUBMITTED",
        }),
        expect.objectContaining({ priority: 1 }),
      );
    });
  });

  describe("setupDigestSchedules", () => {
    it("adds daily and weekly digest repeat jobs", async () => {
      await closeEmailQueue();
      await setupDigestSchedules();

      const queue = getEmailQueue();
      expect(queue?.add).toHaveBeenCalledWith(
        "daily-digest",
        expect.objectContaining({ type: "digest", period: "daily" }),
        expect.objectContaining({
          repeat: { pattern: "0 8 * * *" },
        }),
      );
      expect(queue?.add).toHaveBeenCalledWith(
        "weekly-digest",
        expect.objectContaining({ type: "digest", period: "weekly" }),
        expect.objectContaining({
          repeat: { pattern: "0 9 * * 1" },
        }),
      );
    });
  });

  describe("startEmailWorker", () => {
    it("creates a worker instance", () => {
      const worker = startEmailWorker();
      expect(worker).not.toBeNull();
    });
  });
});

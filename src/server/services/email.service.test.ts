import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("nodemailer", () => {
  const sendMailFn = vi.fn().mockResolvedValue({ messageId: "test-msg-id" });
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({ sendMail: sendMailFn }),
    },
  };
});

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { sendEmail, isEmailConfigured, resetTransporter } from "./email.service";
import nodemailer from "nodemailer";

describe("email.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTransporter();
  });

  describe("sendEmail", () => {
    it("returns false when SMTP is not configured", async () => {
      const originalHost = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);
      process.env.SMTP_HOST = originalHost;
    });

    it("sends email when SMTP is configured", async () => {
      process.env.SMTP_HOST = "smtp.test.com";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "testuser";
      process.env.SMTP_PASS = "testpass";

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Test body</p>",
        text: "Test body",
      });

      expect(result).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.test.com",
          port: 587,
        }),
      );

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    it("returns false and logs error on send failure", async () => {
      process.env.SMTP_HOST = "smtp.test.com";
      resetTransporter();

      const mockTransport = {
        sendMail: vi.fn().mockRejectedValue(new Error("SMTP connection failed")),
      };
      vi.mocked(nodemailer.createTransport).mockReturnValue(
        mockTransport as unknown as ReturnType<typeof nodemailer.createTransport>,
      );

      const result = await sendEmail({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result).toBe(false);

      delete process.env.SMTP_HOST;
    });
  });

  describe("isEmailConfigured", () => {
    it("returns false when SMTP_HOST is not set", () => {
      const original = process.env.SMTP_HOST;
      delete process.env.SMTP_HOST;
      expect(isEmailConfigured()).toBe(false);
      process.env.SMTP_HOST = original;
    });

    it("returns true when SMTP_HOST is set", () => {
      process.env.SMTP_HOST = "smtp.test.com";
      expect(isEmailConfigured()).toBe(true);
      delete process.env.SMTP_HOST;
    });
  });
});

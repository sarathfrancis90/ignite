import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "email" });

let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getSmtpConfig(): SMTPTransport.Options | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (!host) return null;

  return {
    host,
    port: port ? Number(port) : 587,
    secure: port === "465",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  };
}

function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> | null {
  if (transporter) return transporter;

  const config = getSmtpConfig();
  if (!config) {
    childLogger.warn("SMTP not configured — email sending disabled");
    return null;
  }

  transporter = nodemailer.createTransport(config);
  childLogger.info({ host: config.host, port: config.port }, "SMTP transporter created");
  return transporter;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "noreply@ignite.local";
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    childLogger.info(
      { to: input.to, subject: input.subject },
      "Email skipped — SMTP not configured",
    );
    return false;
  }

  try {
    const result = await transport.sendMail({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    childLogger.info(
      { messageId: result.messageId, to: input.to, subject: input.subject },
      "Email sent successfully",
    );
    return true;
  } catch (error) {
    childLogger.error({ error, to: input.to, subject: input.subject }, "Failed to send email");
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

export function resetTransporter(): void {
  transporter = null;
}

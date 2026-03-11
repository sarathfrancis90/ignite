import { Queue, Worker, type Job } from "bullmq";
import type { NotificationType } from "@prisma/client";
import { getQueueConnection, isQueueAvailable } from "@/server/lib/queue-connection";
import { sendEmail } from "@/server/services/email.service";
import { renderNotificationEmail, renderDigestEmail } from "@/server/services/email-templates";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { formatDistanceToNow } from "date-fns";

const childLogger = logger.child({ service: "email-queue" });

const QUEUE_NAME = "email";

export interface EmailJobData {
  type: "immediate";
  notificationId: string;
  userId: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

export interface DigestJobData {
  type: "digest";
  period: "daily" | "weekly";
}

type EmailQueueJobData = EmailJobData | DigestJobData;

let emailQueue: Queue<EmailQueueJobData> | null = null;
let emailWorker: Worker<EmailQueueJobData> | null = null;

export function getEmailQueue(): Queue<EmailQueueJobData> | null {
  if (emailQueue) return emailQueue;
  if (!isQueueAvailable()) return null;

  const connection = getQueueConnection();
  if (!connection) return null;

  emailQueue = new Queue<EmailQueueJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: { age: 604800, count: 5000 },
    },
  });

  childLogger.info("Email queue initialized");
  return emailQueue;
}

async function processImmediateEmail(job: Job<EmailJobData>): Promise<void> {
  const { userId, notificationType, title, body, entityType, entityId } = job.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, notificationFrequency: true },
  });

  if (!user?.email) {
    childLogger.warn({ userId }, "User not found or no email — skipping");
    return;
  }

  if (user.notificationFrequency !== "IMMEDIATE") {
    childLogger.info(
      { userId, frequency: user.notificationFrequency },
      "User preference is not IMMEDIATE — skipping immediate email",
    );
    return;
  }

  const rendered = renderNotificationEmail(notificationType, {
    userName: user.name ?? "User",
    title,
    body,
    entityType,
    entityId,
  });

  await sendEmail({
    to: user.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

async function processDigest(job: Job<DigestJobData>): Promise<void> {
  const { period } = job.data;
  const frequency = period === "daily" ? "DAILY" : "WEEKLY";

  childLogger.info({ period }, "Processing digest job");

  const cutoffHours = period === "daily" ? 24 : 168;
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);

  const usersWithNotifications = await prisma.user.findMany({
    where: {
      notificationFrequency: frequency,
      isActive: true,
      notifications: {
        some: {
          isRead: false,
          createdAt: { gte: cutoff },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notifications: {
        where: {
          isRead: false,
          createdAt: { gte: cutoff },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          title: true,
          body: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      },
    },
  });

  childLogger.info({ period, userCount: usersWithNotifications.length }, "Found users for digest");

  for (const user of usersWithNotifications) {
    if (!user.email || user.notifications.length === 0) continue;

    const rendered = renderDigestEmail({
      userName: user.name ?? "User",
      period,
      items: user.notifications.map((n) => ({
        title: n.title,
        body: n.body,
        entityType: n.entityType,
        entityId: n.entityId,
        createdAt: formatDistanceToNow(n.createdAt, { addSuffix: true }),
      })),
    });

    const sent = await sendEmail({
      to: user.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (sent) {
      childLogger.info({ userId: user.id, itemCount: user.notifications.length }, "Digest sent");
    }
  }
}

async function processEmailJob(job: Job<EmailQueueJobData>): Promise<void> {
  if (job.data.type === "immediate") {
    await processImmediateEmail(job as Job<EmailJobData>);
  } else if (job.data.type === "digest") {
    await processDigest(job as Job<DigestJobData>);
  } else {
    childLogger.warn({ jobData: job.data }, "Unknown email job type");
  }
}

export function startEmailWorker(): Worker<EmailQueueJobData> | null {
  if (emailWorker) return emailWorker;
  if (!isQueueAvailable()) return null;

  const connection = getQueueConnection();
  if (!connection) return null;

  emailWorker = new Worker<EmailQueueJobData>(QUEUE_NAME, processEmailJob, {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  emailWorker.on("completed", (job) => {
    childLogger.info({ jobId: job.id, type: job.data.type }, "Email job completed");
  });

  emailWorker.on("failed", (job, error) => {
    childLogger.error({ jobId: job?.id, type: job?.data.type, error }, "Email job failed");
  });

  childLogger.info("Email worker started");
  return emailWorker;
}

export async function enqueueImmediateEmail(data: Omit<EmailJobData, "type">): Promise<void> {
  const queue = getEmailQueue();
  if (!queue) {
    childLogger.info({ userId: data.userId }, "Email queue not available — skipping email");
    return;
  }

  await queue.add(
    "immediate-email",
    { ...data, type: "immediate" as const },
    {
      priority: 1,
    },
  );

  childLogger.info(
    { userId: data.userId, notificationType: data.notificationType },
    "Immediate email enqueued",
  );
}

export async function setupDigestSchedules(): Promise<void> {
  const queue = getEmailQueue();
  if (!queue) {
    childLogger.info("Email queue not available — digest schedules not set");
    return;
  }

  await queue.add(
    "daily-digest",
    { type: "digest" as const, period: "daily" as const },
    {
      repeat: {
        pattern: "0 8 * * *",
      },
      priority: 5,
    },
  );

  await queue.add(
    "weekly-digest",
    { type: "digest" as const, period: "weekly" as const },
    {
      repeat: {
        pattern: "0 9 * * 1",
      },
      priority: 5,
    },
  );

  childLogger.info("Digest schedules configured (daily at 8am UTC, weekly Monday 9am UTC)");
}

export async function closeEmailQueue(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
  }
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
  }
}

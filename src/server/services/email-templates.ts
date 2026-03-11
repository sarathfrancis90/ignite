import type { NotificationType } from "@prisma/client";

interface NotificationTemplateData {
  userName: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  appUrl?: string;
}

interface DigestItem {
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

interface DigestTemplateData {
  userName: string;
  period: "daily" | "weekly";
  items: DigestItem[];
  appUrl?: string;
}

const BASE_STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
  .header { background: #6d28d9; color: #ffffff; padding: 24px 32px; }
  .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .content { padding: 32px; color: #18181b; }
  .content p { margin: 0 0 16px; line-height: 1.6; font-size: 15px; }
  .cta-button { display: inline-block; background: #6d28d9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 14px; }
  .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
  .digest-item { border-left: 3px solid #6d28d9; padding: 12px 16px; margin-bottom: 16px; background: #faf5ff; border-radius: 0 6px 6px 0; }
  .digest-item h3 { margin: 0 0 4px; font-size: 14px; color: #18181b; }
  .digest-item p { margin: 0; font-size: 13px; color: #52525b; }
  .digest-item .time { font-size: 11px; color: #a1a1aa; margin-top: 4px; }
`;

function buildLayout(title: string, bodyHtml: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>Ignite</h1>
      </div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        <p>You received this email because of your notification settings in Ignite.</p>
        <p><a href="${escapeHtml(appUrl)}/profile" style="color: #6d28d9;">Manage notification preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  IDEA_SUBMITTED: "New Idea Submitted",
  IDEA_STATUS_CHANGED: "Idea Status Changed",
  IDEA_HOT_GRADUATION: "Idea Graduated to HOT",
  EVALUATION_REQUESTED: "Evaluation Requested",
  CAMPAIGN_PHASE_CHANGED: "Campaign Phase Changed",
  COMMENT_ON_FOLLOWED: "New Comment",
  ROLE_ASSIGNED: "Role Assigned",
  SYSTEM: "System Notification",
};

export function renderNotificationEmail(
  type: NotificationType,
  data: NotificationTemplateData,
): { subject: string; html: string; text: string } {
  const appUrl = data.appUrl ?? getAppUrl();
  const typeLabel = NOTIFICATION_TYPE_LABELS[type] ?? "Notification";
  const subject = `[Ignite] ${data.title}`;

  const entityLink =
    data.entityType && data.entityId
      ? `<p><a href="${escapeHtml(appUrl)}/${escapeHtml(data.entityType)}s/${escapeHtml(data.entityId)}" class="cta-button">View ${escapeHtml(data.entityType)}</a></p>`
      : "";

  const bodyHtml = `
    <p>Hi ${escapeHtml(data.userName)},</p>
    <p><strong>${escapeHtml(typeLabel)}</strong></p>
    <p>${escapeHtml(data.body)}</p>
    ${entityLink}
  `;

  const text = `Hi ${data.userName},\n\n${typeLabel}\n\n${data.body}\n\n---\nManage notification preferences: ${appUrl}/profile`;

  return { subject, html: buildLayout(subject, bodyHtml, appUrl), text };
}

export function renderDigestEmail(data: DigestTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const appUrl = data.appUrl ?? getAppUrl();
  const periodLabel = data.period === "daily" ? "Daily" : "Weekly";
  const subject = `[Ignite] Your ${periodLabel} Notification Digest`;

  const itemsHtml = data.items
    .map(
      (item) => `
    <div class="digest-item">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <p class="time">${escapeHtml(item.createdAt)}</p>
    </div>`,
    )
    .join("");

  const bodyHtml = `
    <p>Hi ${escapeHtml(data.userName)},</p>
    <p>Here's your ${periodLabel.toLowerCase()} notification digest with <strong>${data.items.length}</strong> notification${data.items.length === 1 ? "" : "s"}:</p>
    ${itemsHtml}
    <p><a href="${escapeHtml(appUrl)}/notifications" class="cta-button">View all notifications</a></p>
  `;

  const textItems = data.items
    .map((item) => `- ${item.title}: ${item.body} (${item.createdAt})`)
    .join("\n");
  const text = `Hi ${data.userName},\n\nYour ${periodLabel.toLowerCase()} digest (${data.items.length} notifications):\n\n${textItems}\n\n---\nView all: ${appUrl}/notifications\nManage preferences: ${appUrl}/profile`;

  return { subject, html: buildLayout(subject, bodyHtml, appUrl), text };
}

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

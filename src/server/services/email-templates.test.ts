import { describe, it, expect, beforeEach } from "vitest";
import { renderNotificationEmail, renderDigestEmail } from "./email-templates";

describe("email-templates", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = "https://app.ignite.test";
  });

  describe("renderNotificationEmail", () => {
    it("renders a notification email with subject, html, and text", () => {
      const result = renderNotificationEmail("IDEA_SUBMITTED", {
        userName: "Alice",
        title: "New idea submitted",
        body: 'Idea "Widget Pro" was submitted in campaign "Q1 Ideas"',
        entityType: "idea",
        entityId: "idea_123",
      });

      expect(result.subject).toBe("[Ignite] New idea submitted");
      expect(result.html).toContain("Alice");
      expect(result.html).toContain("New Idea Submitted");
      expect(result.html).toContain("Widget Pro");
      expect(result.html).toContain("idea_123");
      expect(result.text).toContain("Alice");
      expect(result.text).toContain("Widget Pro");
    });

    it("renders without entity link when entityType is missing", () => {
      const result = renderNotificationEmail("SYSTEM", {
        userName: "Bob",
        title: "System update",
        body: "Platform maintenance scheduled",
      });

      expect(result.html).not.toContain('class="cta-button">View');
      expect(result.html).toContain("System Notification");
    });

    it("escapes HTML in user content", () => {
      const result = renderNotificationEmail("IDEA_SUBMITTED", {
        userName: '<script>alert("xss")</script>',
        title: "Test",
        body: '<img onerror="alert(1)">',
      });

      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
      expect(result.html).toContain("onerror=&quot;");
    });

    it("includes manage preferences link in footer", () => {
      const result = renderNotificationEmail("ROLE_ASSIGNED", {
        userName: "Carol",
        title: "Role assigned",
        body: "You have been assigned a role",
      });

      expect(result.html).toContain("https://app.ignite.test/profile");
      expect(result.text).toContain("https://app.ignite.test/profile");
    });
  });

  describe("renderDigestEmail", () => {
    it("renders a daily digest email", () => {
      const result = renderDigestEmail({
        userName: "Dave",
        period: "daily",
        items: [
          {
            title: "New idea submitted",
            body: "Widget Pro was submitted",
            entityType: "idea",
            entityId: "idea_1",
            createdAt: "2 hours ago",
          },
          {
            title: "Campaign phase changed",
            body: "Q1 Ideas moved to voting",
            entityType: "campaign",
            entityId: "camp_1",
            createdAt: "5 hours ago",
          },
        ],
      });

      expect(result.subject).toBe("[Ignite] Your Daily Notification Digest");
      expect(result.html).toContain("Dave");
      expect(result.html).toContain("<strong>2</strong> notifications");
      expect(result.html).toContain("Widget Pro was submitted");
      expect(result.html).toContain("Q1 Ideas moved to voting");
      expect(result.text).toContain("daily digest");
      expect(result.text).toContain("2 notifications");
    });

    it("renders a weekly digest email", () => {
      const result = renderDigestEmail({
        userName: "Eve",
        period: "weekly",
        items: [
          {
            title: "Role assigned",
            body: "You got a new role",
            entityType: null,
            entityId: null,
            createdAt: "3 days ago",
          },
        ],
      });

      expect(result.subject).toBe("[Ignite] Your Weekly Notification Digest");
      expect(result.html).toContain("<strong>1</strong> notification:");
      expect(result.html).not.toContain("<strong>1</strong> notifications");
    });

    it("includes view all notifications link", () => {
      const result = renderDigestEmail({
        userName: "Frank",
        period: "daily",
        items: [],
      });

      expect(result.html).toContain("https://app.ignite.test/notifications");
      expect(result.text).toContain("https://app.ignite.test/notifications");
    });
  });
});

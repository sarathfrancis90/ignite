import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
  });

  test("metrics endpoint returns prometheus format", async ({ request }) => {
    const response = await request.get("/api/metrics");
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("ignite_up 1");
    expect(text).toContain("ignite_uptime_seconds");
  });

  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Ignite");
  });

  test("login page loads (ComingSoon or real)", async ({ page }) => {
    await page.goto("/login");
    // Should either show the real login form or ComingSoon — never 404
    await expect(page.locator("body")).not.toContainText("404");
    // CardTitle renders as h3; accept h2 or h3 for flexibility
    await expect(page.locator("h2, h3").first()).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("h2, h3").first()).toBeVisible();
  });

  test("dashboard page loads (ComingSoon or real)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("all navigation links resolve without 404", async ({ page }) => {
    const routes = [
      "/dashboard",
      "/campaigns",
      "/channels",
      "/explore",
      "/tasks",
      "/reports",
      "/profile",
      "/projects",
      "/strategy/trends",
      "/strategy/technologies",
      "/strategy/insights",
      "/strategy/sias",
      "/partners",
      "/admin/users",
      "/admin/org-units",
      "/admin/groups",
      "/admin/notifications",
      "/admin/customization",
      "/admin/settings",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `Route ${route} should not 404`).not.toBe(404);
    }
  });
});

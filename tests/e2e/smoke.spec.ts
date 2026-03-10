import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("health endpoint returns 200 with valid status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(body.timestamp).toBeDefined();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.database.status).toBe("ok");
  });

  test("metrics endpoint returns prometheus format", async ({ request }) => {
    const response = await request.get("/api/metrics");
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).toContain("ignite_up 1");
    expect(text).toContain("ignite_uptime_seconds");
  });

  test("auth providers endpoint returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/auth/providers");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  test("auth session endpoint returns valid JSON", async ({ request }) => {
    const response = await request.get("/api/auth/session");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(typeof body).toBe("object");
  });

  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Ignite");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).not.toContainText("404");
    // CardTitle renders as h3; accept h2 or h3 for flexibility
    await expect(page.locator("h2, h3").first()).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("body")).not.toContainText("404");
    await expect(page.locator("h2, h3").first()).toBeVisible();
  });

  test("protected routes redirect unauthenticated users to login", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/campaigns",
      "/profile",
      "/admin/users",
      "/admin/groups",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Middleware should redirect to /login with callbackUrl
      await page.waitForURL(/\/login/);
      expect(page.url(), `${route} should redirect to /login`).toContain("/login");
    }
  });

  test("all navigation routes are accessible (no 500 errors)", async ({ request }) => {
    const routes = [
      "/",
      "/login",
      "/register",
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
      const response = await request.get(route, {
        maxRedirects: 0,
      });
      const status = response.status();
      // Accept 200 (public pages) or 307 (redirect to login for protected pages)
      // Never allow 404 or 500
      expect(
        status === 200 || status === 307,
        `Route ${route} returned ${status} — expected 200 or 307`,
      ).toBe(true);
    }
  });
});

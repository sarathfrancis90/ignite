import { test, expect } from "@playwright/test";

/**
 * E2E tests for registration and login flows.
 * These tests verify the actual authentication functionality,
 * not just page loading.
 */

const TEST_USER = {
  name: "E2E Test User",
  email: `e2e-test-${Date.now()}@example.com`,
  password: "TestPassword123",
};

test.describe("Authentication Flow", () => {
  test.describe("Registration", () => {
    test("register page has all required form fields", async ({ page }) => {
      await page.goto("/register");

      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      // Password fields may have different labels
      const passwordInputs = page.locator('input[type="password"]');
      await expect(passwordInputs.first()).toBeVisible();
    });

    test("shows validation errors for empty form submission", async ({ page }) => {
      await page.goto("/register");

      // Try to submit empty form
      const submitButton = page.getByRole("button", { name: /register|sign up|create/i });
      await submitButton.click();

      // Should show validation errors (stay on register page)
      await expect(page).toHaveURL(/\/register/);
    });

    test("shows validation error for weak password", async ({ page }) => {
      await page.goto("/register");

      await page.getByLabel(/name/i).fill("Test User");
      await page.getByLabel(/email/i).fill("test@example.com");
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill("weak");

      const submitButton = page.getByRole("button", { name: /register|sign up|create/i });
      await submitButton.click();

      // Should stay on register page due to validation
      await expect(page).toHaveURL(/\/register/);
    });

    test("successfully registers a new user", async ({ page }) => {
      await page.goto("/register");

      await page.getByLabel(/name/i).fill(TEST_USER.name);
      await page.getByLabel(/email/i).fill(TEST_USER.email);
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill(TEST_USER.password);

      // If there's a confirm password field, fill it too
      if ((await passwordInputs.count()) > 1) {
        await passwordInputs.nth(1).fill(TEST_USER.password);
      }

      const submitButton = page.getByRole("button", { name: /register|sign up|create/i });
      await submitButton.click();

      // Should redirect to dashboard on successful registration
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      expect(page.url()).toContain("/dashboard");
    });
  });

  test.describe("Login", () => {
    test("login page has all required form fields", async ({ page }) => {
      await page.goto("/login");

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in|log in|login/i })).toBeVisible();
    });

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel(/email/i).fill("nonexistent@example.com");
      await page.locator('input[type="password"]').fill("WrongPassword123");

      const submitButton = page.getByRole("button", { name: /sign in|log in|login/i });
      await submitButton.click();

      // Should stay on login page and show error
      await expect(page).toHaveURL(/\/login/);
      // Wait a moment for error to appear
      await page.waitForTimeout(1000);
      // Should show some kind of error feedback
      const pageContent = await page.textContent("body");
      expect(
        pageContent?.includes("Invalid") ||
          pageContent?.includes("error") ||
          pageContent?.includes("incorrect") ||
          pageContent?.includes("failed") ||
          page.url().includes("error"),
      ).toBeTruthy();
    });

    test("successfully logs in with valid credentials", async ({ page }) => {
      // First register a user to ensure we have valid credentials
      const loginEmail = `e2e-login-${Date.now()}@example.com`;
      const loginPassword = "LoginTest123";

      await page.goto("/register");
      await page.getByLabel(/name/i).fill("Login Test User");
      await page.getByLabel(/email/i).fill(loginEmail);
      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.first().fill(loginPassword);
      if ((await passwordInputs.count()) > 1) {
        await passwordInputs.nth(1).fill(loginPassword);
      }
      await page.getByRole("button", { name: /register|sign up|create/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });

      // Now log out (navigate to login page directly since there may not be a logout button visible)
      await page.goto("/login");

      // Now test login
      await page.getByLabel(/email/i).fill(loginEmail);
      await page.locator('input[type="password"]').fill(loginPassword);
      await page.getByRole("button", { name: /sign in|log in|login/i }).click();

      // Should redirect to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 15000 });
      expect(page.url()).toContain("/dashboard");
    });
  });

  test.describe("Route Protection", () => {
    test("unauthenticated user is redirected from protected routes to login", async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain("/login");
      // Should include callbackUrl so user returns after login
      expect(page.url()).toContain("callbackUrl");
    });

    test("unauthenticated user is redirected from admin routes to login", async ({ page }) => {
      await page.goto("/admin/users");
      await page.waitForURL(/\/login/);
      expect(page.url()).toContain("/login");
    });
  });
});

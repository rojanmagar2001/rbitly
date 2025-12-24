import { test, expect } from "@playwright/test";
import { startTestServer, stopTestServer } from "./testServer";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

test.beforeAll(async () => {
  const started = await startTestServer();
  app = started.app;
});

test.afterAll(async () => {
  await stopTestServer(app);
});

test("home loads hero + empty state sidebar", async ({ page }) => {
  await page.goto("/");

  // Hero headline (matches your new copy)
  await expect(page.getByRole("heading", { name: /Shorten links,\s*instantly/i })).toBeVisible();

  // Empty sidebar state heading
  await expect(page.getByRole("heading", { name: /Ready to go/i })).toBeVisible();

  // URL input should be present and focused (your JS focuses it)
  const urlInput = page.locator("#url");
  await expect(urlInput).toBeVisible();
  await expect(urlInput).toBeFocused();
});

test("invalid URL shows error banner (role=alert) and inline url error", async ({ page }) => {
  await page.goto("/");

  await page.locator("#url").fill("not-a-url");
  await page.getByRole("button", { name: "Shorten URL" }).click();

  // Error banner
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Please fix the following:");

  // Inline field error for URL
  await expect(page.locator("#url-error")).toBeVisible();
});

test("shorten URL shows success card, copy works, recent links populated", async ({ page }) => {
  await page.goto("/");

  await page.locator("#url").fill("https://example.com/some/very/long/path/to/shorten");
  await page.getByRole("button", { name: "Shorten URL" }).click();

  // Success card
  await expect(page.getByRole("heading", { name: "Success!" })).toBeVisible();
  const shortInput = page.locator("#shortUrl");
  await expect(shortInput).toBeVisible();

  const value = await shortInput.inputValue();
  expect(value).toMatch(/^http:\/\/127\.0\.0\.1:3100\/[A-Za-z0-9_-]+$/);

  // Copy button and toast
  await page.getByRole("button", { name: "Copy" }).click();
  const toast = page.locator("#copyToast");
  await expect(toast).toContainText(/Copied/i);

  // "Recent links" list should now include the short url
  await expect(page.getByRole("heading", { name: /Recent links/i })).toBeVisible();
  await expect(page.getByText(value, { exact: true })).toBeVisible();

  // Stats link should exist (result card)
  await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
});

test("keyboard shortcut Ctrl/Cmd+K focuses URL input", async ({ page }) => {
  await page.goto("/");

  // Blur focus somewhere else first
  await page.getByRole("link", { name: "Health" }).focus();
  await expect(page.getByRole("link", { name: "Health" })).toBeFocused();

  // Trigger shortcut
  const isMac = process.platform === "darwin";
  if (isMac) {
    await page.keyboard.down("Meta");
    await page.keyboard.press("k");
    await page.keyboard.up("Meta");
  } else {
    await page.keyboard.down("Control");
    await page.keyboard.press("k");
    await page.keyboard.up("Control");
  }

  await expect(page.locator("#url")).toBeFocused();
});

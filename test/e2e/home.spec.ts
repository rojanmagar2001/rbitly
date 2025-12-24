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

  await expect(page.getByRole("heading", { name: "Shorten links, instantly" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ready to go" })).toBeVisible();

  const url = page.getByRole("textbox", { name: "URL to shorten" });
  await expect(url).toBeVisible();
  await expect(url).toBeFocused();
});

test("shorten URL shows success UI; recent links appear after reload", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("textbox", { name: "URL to shorten" })
    .fill("https://example.com/some/very/long/path/to/shorten");
  await page.getByRole("button", { name: "Shorten URL" }).click();

  await expect(page.getByRole("heading", { name: "Success!" })).toBeVisible();

  const shortInput = page.locator("#shortUrl");
  await expect(shortInput).toBeVisible();

  const shortUrl = await shortInput.inputValue();
  expect(shortUrl).toMatch(/^http:\/\/127\.0\.0\.1:3100\/[A-Za-z0-9_-]+$/);

  // reload => recent list should render from signed cookie
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recent links" })).toBeVisible();

  // Your template uses <a href="{{ item.shortUrl }}">
  const recentLink = page.locator(`a[href="${shortUrl}"]`).first();
  await expect(recentLink).toBeVisible();
});

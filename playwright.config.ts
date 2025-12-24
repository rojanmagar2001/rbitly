import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
  },
});

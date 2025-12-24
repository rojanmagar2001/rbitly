import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  dts: false,
  platform: "node",
  sourcemap: true,
  clean: true,
});

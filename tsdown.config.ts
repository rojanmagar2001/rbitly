import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["es"],
  dts: false,
  platform: "node",
  sourcemap: true,
  clean: true,
});

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  dts: false,
  tsconfig: "tsconfig.json",
});

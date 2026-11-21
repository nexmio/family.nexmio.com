import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8080" } },
  build: { outDir: "dist", emptyOutDir: true },
  test: { include: ["tests/**/*.test.ts", "src/**/*.test.ts"] },
});

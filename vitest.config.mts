import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

// Load the developer's own .env / .env.local so tests use their database and
// APP_SECRET. Nothing is hardcoded here — an empty DATABASE_URL should fail
// loudly rather than silently connecting somewhere unexpected.
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    // Refuses to run against a non-disposable database. See vitest.setup.ts.
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: process.env.DATABASE_URL || env.DATABASE_URL || "",
      DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || env.DATABASE_URL_UNPOOLED || "",
      APP_SECRET: process.env.APP_SECRET || env.APP_SECRET || "test_app_secret_for_local_runs_only",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

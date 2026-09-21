import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    // Tests need DATABASE_URL from the environment (.env / .env.test). Never hardcode one here.
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

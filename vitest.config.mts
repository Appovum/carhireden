import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_DMdN0HcL4AhI@ep-delicate-leaf-awismbmn-pooler.c-12.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

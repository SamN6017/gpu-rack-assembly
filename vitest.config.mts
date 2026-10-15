import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "tests/serverOnly.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});

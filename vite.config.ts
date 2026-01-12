import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: { provider: "v8", include: ["src/**"], exclude: ["src/main.tsx", "src/data/**"] },
  },
});

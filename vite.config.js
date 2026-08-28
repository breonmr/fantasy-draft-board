import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // NOTE: We override `base` at build time in the GitHub Action.
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});

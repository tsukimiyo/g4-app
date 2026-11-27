import { defineConfig, devices } from "@playwright/test";

// 情境測試（Week 3，D 負責）。第一次使用前執行：pnpm exec playwright install chromium
export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Pixel 7"], // 手機優先
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});

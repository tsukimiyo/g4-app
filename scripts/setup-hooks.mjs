// pnpm install 時自動執行（package.json 的 "prepare"）：讓 git 使用 .githooks/ 裡的 hook。
// 不在 git repo 裡（例如 Vercel build）時什麼都不做。
import { execSync } from "node:child_process";
import fs from "node:fs";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
  try {
    fs.chmodSync(".githooks/pre-push", 0o755); // macOS / Linux 需要執行權限
  } catch {
    // Windows 不需要
  }
  console.log("[setup-hooks] 已啟用 .githooks：push 前會自動執行 pnpm check");
} catch {
  // 不在 git repo 裡，略過
}

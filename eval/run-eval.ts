// LLM 抽取品質評估。owner：E
// 執行：pnpm eval（需要 .env.local 的 ANTHROPIC_API_KEY；每次執行都會花 API 費用）
//
// 流程：對 eval/transcripts/*.txt 逐一
//   1. parseTxt() → 用 gold 的 members 名字直接對應（不經過發言者對應頁）
//   2. extractDivision()（或直接 generateStructured）
//   3. 與 eval/gold/<同名>.json 比對，輸出到 eval/out/<時間>.json
//
// 指標（implementation-plan「12/1 demo 驗收」）：
//   - 亂填負責人次數：gold.owners 為 [] 的任務，LLM 卻填了人 → 必須 = 0（demo 前門檻）
//   - 任務抓到率 ≥ 80%：gold 任務中，LLM 有對應任務的比例（標題含任一 keyword 視為對應）
//   - 負責人正確率 ≥ 90%：對應到的任務中，owners 集合完全相同的比例
//   - 截止日正確率 ≥ 80%：對應到的任務中，deadline 相同的比例
//
// 執行完把摘要記在 eval/README.md 的「結果紀錄」（改 prompt 的 commit 必須附）。
// demo 用的回應快取另外存到 eval/cache-demo/（這個資料夾要 commit）。

async function main() {
  // TODO(E)
  console.log("run-eval 尚未實作");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

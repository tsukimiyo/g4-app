// 回報頻率建議。owner：D
// 測試：tests/unit/suggest-frequency.test.ts

/**
 * 依「今天到截止日」的天數：
 * - ≤ 4 天 → 每 2 天
 * - ≤ 14 天 → 每 7 天
 * - 更長 → 每 14 天
 * 時間預設 21:00。
 */
export function suggestFrequency(
  _deadline: string,
  _today: string,
): { reportEveryDays: number; reportTime: string } {
  // TODO(D)
  throw new Error("suggestFrequency 尚未實作");
}

/** 畫面上的三個預設選項（12/1 demo 範圍；自訂「每 N 天、幾點」12/2 之後） */
export const FREQUENCY_PRESETS = [
  { label: "每 2 天", reportEveryDays: 2 },
  { label: "每週", reportEveryDays: 7 },
  { label: "每 2 週", reportEveryDays: 14 },
] as const;

// 時間與日期的共用工具。整個專案的「今天」「截止日」一律以 Asia/Taipei 計算。
export const TIME_ZONE = "Asia/Taipei";

/** Asia/Taipei 的今天，格式 YYYY-MM-DD */
export function todayInTaipei(now: Date = new Date()): string {
  // en-CA 的日期格式剛好是 YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * 把各種時間字串統一成 HH:MM。
 * - Postgres time 欄位讀出來是 "21:00:00"
 * - 逐字稿可能寫 "9:05"
 */
export function toHm(value: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) throw new Error(`無法解析時間：${value}`);
  const [, h, min] = m;
  return `${h!.padStart(2, "0")}:${min}`;
}

/** 兩個 YYYY-MM-DD 相差幾天（b - a） */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

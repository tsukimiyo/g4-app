// owner：D
import { describe, expect, it } from "vitest";
import { FREQUENCY_PRESETS, suggestFrequency } from "@/lib/rules/suggest-frequency";

const today = "2026-11-30";
const every = (deadline: string) => suggestFrequency(deadline, today).reportEveryDays;

describe("suggestFrequency", () => {
  it("剩 4 天以內 → 每 2 天", () => {
    expect(every("2026-12-01")).toBe(2); // 1 天
    expect(every("2026-12-04")).toBe(2); // 4 天（邊界）
  });
  it("今天截止或已過期 → 每 2 天", () => {
    expect(every(today)).toBe(2);
    expect(every("2026-11-20")).toBe(2);
  });
  it("剩 5–14 天 → 每 7 天", () => {
    expect(every("2026-12-05")).toBe(7); // 5 天（邊界）
    expect(every("2026-12-14")).toBe(7); // 14 天（邊界）
  });
  it("剩 15 天以上 → 每 14 天", () => {
    expect(every("2026-12-15")).toBe(14); // 15 天（邊界）
    expect(every("2027-01-20")).toBe(14); // 跨年
  });
  it("reportTime 預設 21:00", () => {
    expect(suggestFrequency("2026-12-10", today).reportTime).toBe("21:00");
  });
  it("建議值一定是畫面上的預設選項之一", () => {
    const presets: number[] = FREQUENCY_PRESETS.map((p) => p.reportEveryDays);
    for (const d of ["2026-11-01", "2026-12-03", "2026-12-10", "2027-03-01"]) {
      expect(presets).toContain(every(d));
    }
  });
});

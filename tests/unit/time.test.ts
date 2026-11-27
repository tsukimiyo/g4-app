import { describe, expect, it } from "vitest";
import { daysBetween, todayInTaipei, toHm } from "@/lib/time";

describe("toHm", () => {
  it("補零", () => expect(toHm("9:05")).toBe("09:05"));
  it("去掉秒數（Postgres time 欄位）", () => expect(toHm("21:00:00")).toBe("21:00"));
  it("格式錯誤丟例外", () => expect(() => toHm("abc")).toThrow());
});

describe("todayInTaipei", () => {
  it("UTC 16:30 在台北已經是隔天", () => {
    expect(todayInTaipei(new Date("2026-11-30T16:30:00Z"))).toBe("2026-12-01");
  });
});

describe("daysBetween", () => {
  it("跨月", () => expect(daysBetween("2026-11-30", "2026-12-04")).toBe(4));
});

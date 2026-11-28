// owner：D
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ParsedTranscript } from "@/lib/schemas/transcript";
import { MESSAGE_LINE, parseTxt } from "@/lib/transcript/parse-txt";

describe("MESSAGE_LINE regex（規格已定）", () => {
  const match = (line: string) => {
    const m = MESSAGE_LINE.exec(line);
    return m ? { time: m[1] ?? null, name: m[2], text: m[3] } : null;
  };

  it("標準格式", () => {
    expect(match("13:05 品妤：教授的 feedback 我來整理")).toEqual({
      time: "13:05",
      name: "品妤",
      text: "教授的 feedback 我來整理",
    });
  });
  it("半形冒號、沒有時間", () => {
    expect(match("育誠: 說明文字我寫")).toEqual({ time: null, name: "育誠", text: "說明文字我寫" });
  });
  it("時間和名字之間沒有空白", () => {
    expect(match("9:05品妤：好")).toEqual({ time: "9:05", name: "品妤", text: "好" });
  });
  it("名字後面有空白", () => {
    expect(match("13:05 Amy Chen ：OK")?.name).toBe("Amy Chen");
  });
  it("跨行的網址不是新的一句", () => {
    expect(match("https://example.com/hci-notes")).toBeNull();
  });
  it("沒有冒號的行不是新的一句", () => {
    expect(match("會先做開工和回報那幾頁")).toBeNull();
  });
  it("名字超過 20 字不是新的一句", () => {
    expect(match("這是一段很長很長很長很長很長很長很長的句子：後面")).toBeNull();
  });
});

describe("parseTxt", () => {
  /** 只取成功的結果；失敗就讓測試直接報錯並印出錯誤 */
  const ok = (text: string) => {
    const r = parseTxt(text);
    if (!r.ok) throw new Error(`預期成功，卻失敗：${JSON.stringify(r.error)}`);
    return r.transcript;
  };
  const err = (text: string) => {
    const r = parseTxt(text);
    if (r.ok) throw new Error("預期失敗，卻成功");
    return r.error;
  };
  const file = (path: string) => readFileSync(resolve(path), "utf8");

  it("第一行 # 2026-11-16 標題 → meetingDate 與 title", () => {
    const t = ok("# 2026-11-16 第 4 組期末專題分工\n13:05 品妤：好");
    expect(t.meetingDate).toBe("2026-11-16");
    expect(t.title).toBe("第 4 組期末專題分工");
  });
  it("第一行沒有 # → meetingDate 為 null、title 為 null", () => {
    const t = ok("13:05 品妤：好");
    expect(t.meetingDate).toBeNull();
    expect(t.title).toBeNull();
    expect(t.messages).toHaveLength(1);
  });
  it("# 後面只有標題沒有日期 → meetingDate 為 null", () => {
    const t = ok("# 期末分工\n品妤：好");
    expect(t.meetingDate).toBeNull();
    expect(t.title).toBe("期末分工");
  });
  it("# 後面只有日期 → title 為 null", () => {
    const t = ok("#2026-11-16\n品妤：好");
    expect(t.meetingDate).toBe("2026-11-16");
    expect(t.title).toBeNull();
  });
  it("不存在的日期（2026-13-40）→ meetingDate 為 null，原文留在 title", () => {
    const t = ok("# 2026-13-40 分工\n品妤：好");
    expect(t.meetingDate).toBeNull();
    expect(t.title).toBe("2026-13-40 分工");
  });
  it("時間補零：9:05 → 09:05", () => {
    expect(ok("9:05 品妤：好").messages[0]!.time).toBe("09:05");
  });
  it("不合法的時間（25:00）當作沒寫", () => {
    const m = ok("25:00 品妤：好").messages[0]!;
    expect(m.time).toBeNull();
    expect(m.speakerRaw).toBe("品妤");
  });
  it("一句的完整欄位", () => {
    expect(ok("13:05 品妤：教授的 feedback 我來整理").messages[0]).toEqual({
      idx: 0,
      time: "13:05",
      speakerRaw: "品妤",
      memberId: null,
      text: "教授的 feedback 我來整理",
    });
  });
  it("不符合格式的行接到上一句（以 \\n 連接）", () => {
    const t = ok("13:08 詩涵：prototype 畫面我做\n會先做開工和回報那幾頁\n13:10 育誠：好");
    expect(t.messages[0]!.text).toBe("prototype 畫面我做\n會先做開工和回報那幾頁");
    expect(t.messages).toHaveLength(2);
  });
  it("跨行的網址接到上一句", () => {
    const t = ok("柏翰：參考資料我放這裡\nhttps://example.com/hci-notes");
    expect(t.messages[0]!.text).toBe("參考資料我放這裡\nhttps://example.com/hci-notes");
    expect(t.speakers).toEqual(["柏翰"]);
  });
  it("跨行內容裡的時間（明天 10:00 集合）不會變成發言者", () => {
    const t = ok("品妤：那就這樣\n明天 10:00 集合\n下午 2:30 交");
    expect(t.messages).toHaveLength(1);
    expect(t.messages[0]!.text).toBe("那就這樣\n明天 10:00 集合\n下午 2:30 交");
  });
  it("已知限制：跨行內容以「短詞＋冒號」開頭會被當成新的一句", () => {
    expect(ok("品妤：好\n注意：要先登入").speakers).toEqual(["品妤", "注意"]);
  });
  it("空行略過，不影響 idx", () => {
    const t = ok("品妤：一\n\n\n柏翰：二\n   \n詩涵：三");
    expect(t.messages.map((m) => m.idx)).toEqual([0, 1, 2]);
    expect(t.messages[0]!.text).toBe("一");
  });
  it("idx 從 0 開始連續", () => {
    const t = ok("# 2026-11-16 x\n品妤：一\n接續\n柏翰：二\n品妤：三");
    expect(t.messages.map((m) => m.idx)).toEqual([0, 1, 2]);
  });
  it("行首行尾的空白（含全形空白）會去掉", () => {
    const m = ok("  13:05 品妤：好  \u3000").messages[0]!;
    expect(m.speakerRaw).toBe("品妤");
    expect(m.text).toBe("好");
  });
  it("speakers 去重、依第一次出現順序", () => {
    expect(ok("柏翰：一\n品妤：二\n柏翰：三\n詩涵：四\n品妤：五").speakers).toEqual([
      "柏翰",
      "品妤",
      "詩涵",
    ]);
  });
  it("處理 \\r\\n 與開頭的 BOM", () => {
    const t = ok("\uFEFF# 2026-11-16 分工\r\n13:05 品妤：好\r\n接續\r\n13:06 柏翰：OK\r\n");
    expect(t.meetingDate).toBe("2026-11-16");
    expect(t.messages.map((m) => m.text)).toEqual(["好\n接續", "OK"]);
  });
  it("開頭的空行略過，之後的 # 行仍算標題", () => {
    expect(ok("\n\n# 2026-11-16 分工\n品妤：好").meetingDate).toBe("2026-11-16");
  });
  it("第一句之前出現不符格式的行 → NO_MESSAGE_BEFORE_LINE，line 為該行行號（從 1 起算）", () => {
    expect(err("# 2026-11-16 分工\n\n今天的會議記錄\n品妤：好")).toEqual({
      line: 3,
      reason: "NO_MESSAGE_BEFORE_LINE",
      content: "今天的會議記錄",
    });
  });
  it("第一句之前出現名字超過 20 字的行 → NAME_TOO_LONG", () => {
    expect(err("這是一段很長很長很長很長很長很長很長的句子：後面").reason).toBe("NAME_TOO_LONG");
  });
  it("整份沒有任何一句 → NO_MESSAGES", () => {
    expect(err("# 2026-11-16 分工\n\n").reason).toBe("NO_MESSAGES");
    expect(err("").reason).toBe("NO_MESSAGES");
  });
  it("有亂碼（U+FFFD，Big5 檔被當成 UTF-8 讀）→ NOT_UTF8，回報第一個亂碼的行號", () => {
    expect(err("品妤：好\n\uFFFD\uFFFD：x")).toMatchObject({ line: 2, reason: "NOT_UTF8" });
  });
  it("public/samples/transcript-example.txt 解析成 6 句，且符合 ParsedTranscript schema", () => {
    const t = ok(file("public/samples/transcript-example.txt"));
    expect(() => ParsedTranscript.parse(t)).not.toThrow();
    expect(t.meetingDate).toBe("2026-11-16");
    expect(t.messages).toHaveLength(6);
    expect(t.speakers).toEqual(["品妤", "柏翰", "詩涵", "育誠"]);
  });
  it("eval/transcripts/script-silent-member.txt 解析成 11 句", () => {
    const t = ok(file("eval/transcripts/script-silent-member.txt"));
    expect(t.meetingDate).toBe("2026-11-30");
    expect(t.messages).toHaveLength(11);
    expect(t.messages[3]!.text).toBe("prototype 畫面我做，12/10 前\n會先做開工和回報那幾頁");
    expect(t.messages[9]!.text).toBe("參考資料我放這裡\nhttps://example.com/hci-notes");
  });
});

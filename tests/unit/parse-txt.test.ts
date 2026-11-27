// owner：D。把 it.todo 逐一改成真正的測試（先寫測試再實作 parseTxt 最快）。
import { describe, expect, it } from "vitest";
import { MESSAGE_LINE } from "@/lib/transcript/parse-txt";

describe("MESSAGE_LINE regex（規格已定，這幾個測試現在就該通過）", () => {
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
  it.todo("第一行 # 2026-11-16 標題 → meetingDate 與 title");
  it.todo("第一行沒有 # → meetingDate 為 null、title 為 null");
  it.todo("# 後面只有標題沒有日期 → meetingDate 為 null");
  it.todo("時間補零：9:05 → 09:05");
  it.todo("不符合格式的行接到上一句（以 \\n 連接）");
  it.todo("空行略過，不影響 idx");
  it.todo("idx 從 0 開始連續");
  it.todo("speakers 去重、依第一次出現順序");
  it.todo("處理 \\r\\n 與開頭的 BOM");
  it.todo("第一句之前出現不符格式的行 → NO_MESSAGE_BEFORE_LINE，line 為該行行號（從 1 起算）");
  it.todo("整份沒有任何一句 → NO_MESSAGES");
  it.todo("eval/transcripts/script-silent-member.txt 解析成 11 句");
});

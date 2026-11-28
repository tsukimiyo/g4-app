// owner：D
// LINE 聊天記錄匯出檔。tests/fixtures/line-export.txt 是照真實匯出檔的結構自己編的內容。
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ParsedTranscript } from "@/lib/schemas/transcript";
import { normalizeLineTime, parseLineExport } from "@/lib/transcript/parse-line";
import { parseTxt } from "@/lib/transcript/parse-txt";

const T = "\t";
const HEADER = ["[LINE] 第4組期末專題的聊天記錄", "儲存日期： 2026/11/28 14:18", ""];
/** 組一份 LINE 匯出檔：自動加上標題與日期行 */
const lineFile = (body: string[], date = "2026/11/16（一）") =>
  [...HEADER, date, ...body].join("\n");
const msg = (time: string, name: string, text: string) => [time, name, text].join(T);

const ok = (text: string, maxMessages?: number) => {
  const r = parseTxt(text, { maxMessages });
  if (!r.ok) throw new Error(`預期成功，卻失敗：${JSON.stringify(r.error)}`);
  return r;
};
const texts = (text: string) => ok(text).transcript.messages.map((m) => m.text);

describe("parseTxt：LINE 匯出檔", () => {
  it("tests/fixtures/line-export.txt：格式、標題、日期、句數、發言者", () => {
    const r = ok(readFileSync(resolve("tests/fixtures/line-export.txt"), "utf8"));
    expect(r.format).toBe("line");
    expect(r.dropped).toBe(0);
    expect(() => ParsedTranscript.parse(r.transcript)).not.toThrow();

    const t = r.transcript;
    expect(t.title).toBe("第4組期末專題");
    expect(t.meetingDate).toBe("2026-11-16"); // 最後一句所在的日期
    expect(t.messages).toHaveLength(13); // 貼圖、照片、通話、系統訊息都略過
    expect(t.messages.map((m) => m.idx)).toEqual([...Array(13).keys()]);
    // 柏翰第一則是貼圖、冠廷第一則是通話紀錄 → 依「第一則有內容的訊息」排序
    expect(t.speakers).toEqual(["品妤", "詩涵", "育誠", "柏翰", "冠廷"]);
    expect(t.messages[3]).toEqual({
      idx: 3,
      time: "13:00",
      speakerRaw: "品妤",
      memberId: null,
      text: "今天來分一下期末的工作",
    });
    expect(t.messages[4]!.text).toBe("教授的 feedback 我來整理\n這週五前給大家");
    expect(t.messages[6]!.text).toBe(
      'prototype 畫面我做，12/1 前\n會先做開工和回報那幾頁\n"登入"那頁最後做',
    );
  });

  it("CRLF 的檔案、多行訊息內部是 LF（真實匯出檔就是這樣混著）", () => {
    const text =
      "\uFEFF[LINE] 群組的聊天記錄\r\n儲存日期： 2026/11/28 14:18\r\n\r\n2026/11/16（一）\r\n" +
      `13:01${T}品妤${T}"第一行\n第二行"\r\n13:02${T}柏翰${T}好\r\n`;
    expect(texts(text)).toEqual(["第一行\n第二行", "好"]);
  });

  it("貼圖、照片、檔案、影片、語音訊息、通話紀錄都略過", () => {
    const noise = ["[貼圖]", "[照片]", "[檔案]", "[影片]", "[語音訊息]", "☎ 未接來電", "[Sticker]"];
    const body = [...noise.map((n) => msg("13:00", "品妤", n)), msg("13:01", "品妤", "正題")];
    expect(texts(lineFile(body))).toEqual(["正題"]);
  });

  it("訊息裡提到貼圖的字樣（不是整則）會保留", () => {
    expect(texts(lineFile([msg("13:00", "品妤", "[貼圖] 這張好可愛")]))).toEqual([
      "[貼圖] 這張好可愛",
    ]);
  });

  it("系統訊息（名字欄空白、或只有兩欄）略過，也不會吃掉下一行", () => {
    const body = [
      msg("13:00", "", "柏翰已收回訊息"),
      `13:01${T}詩涵已退出群組。`,
      msg("13:02", "品妤", "好"),
    ];
    const t = ok(lineFile(body)).transcript;
    expect(t.speakers).toEqual(["品妤"]);
    expect(t.messages.map((m) => m.text)).toEqual(["好"]);
  });

  it("多行訊息裡出現日期或冒號的行，仍算同一則的內容", () => {
    const body = [msg("13:00", "品妤", '"時程'), "2026/12/01（二）交初稿", '注意：要先登入"'];
    expect(texts(lineFile(body))).toEqual(["時程\n2026/12/01（二）交初稿\n注意：要先登入"]);
  });

  it("多行訊息沒有結束引號就遇到下一則 → 結束這則", () => {
    const body = [msg("13:00", "品妤", '"沒有結尾'), "第二行", msg("13:01", "柏翰", "下一則")];
    expect(texts(lineFile(body))).toEqual(["沒有結尾\n第二行", "下一則"]);
  });

  it("單行、自己打的引號保留原樣", () => {
    expect(texts(lineFile([msg("13:00", "品妤", '"好"')]))).toEqual(['"好"']);
  });

  it("名字超過 20 字只取前 20 字", () => {
    const longName = "超".repeat(25);
    expect(ok(lineFile([msg("13:00", longName, "嗨")])).transcript.speakers).toEqual([
      "超".repeat(20),
    ]);
  });

  it("跨多天：meetingDate 是最後一句的日期", () => {
    const text = [
      ...HEADER,
      "2026/11/14（六）",
      msg("20:00", "品妤", "嗨"),
      "",
      "2026/11/16（一）",
      msg("13:00", "柏翰", "好"),
      "",
      "2026/11/20（五）",
      msg("09:00", "品妤", "[貼圖]"), // 最後一天只有貼圖 → 不算
    ].join("\n");
    expect(ok(text).transcript.meetingDate).toBe("2026-11-16");
  });

  it("日期行的其他寫法：半形括號、星期", () => {
    expect(
      ok(lineFile([msg("13:00", "品妤", "嗨")], "2026/11/16(一)")).transcript.meetingDate,
    ).toBe("2026-11-16");
    expect(
      ok(lineFile([msg("13:00", "品妤", "嗨")], "2026.11.16 星期一")).transcript.meetingDate,
    ).toBe("2026-11-16");
  });

  it("英文介面的標題", () => {
    const text = ["[LINE] Chat history with G4", "", "2026/11/16（一）", msg("13:00", "Amy", "hi")];
    expect(ok(text.join("\n")).transcript.title).toBe("G4");
  });

  it("只有貼圖、系統訊息 → NO_MESSAGES", () => {
    const r = parseTxt(
      lineFile([msg("13:00", "品妤", "[貼圖]"), msg("13:01", "", "柏翰已收回訊息")]),
    );
    expect(r).toMatchObject({ ok: false, error: { reason: "NO_MESSAGES" } });
  });

  it("[LINE] 不在第一行 → 當作標準格式", () => {
    const r = parseTxt("品妤：好\n[LINE] 不是標題");
    expect(r).toMatchObject({ ok: true, format: "standard" });
  });
});

describe("parseTxt：句數上限", () => {
  const body = Array.from({ length: 10 }, (_, i) =>
    msg(`13:0${i}`, i < 5 ? "品妤" : "柏翰", `第 ${i} 句`),
  );

  it("超過上限 → 只保留最後面的句子，idx 重新從 0 開始，dropped 是略過的句數", () => {
    const r = ok(lineFile(body), 4);
    expect(r.dropped).toBe(6);
    expect(r.transcript.messages.map((m) => [m.idx, m.text])).toEqual([
      [0, "第 6 句"],
      [1, "第 7 句"],
      [2, "第 8 句"],
      [3, "第 9 句"],
    ]);
    expect(r.transcript.speakers).toEqual(["柏翰"]); // 只算保留下來的
  });

  it("沒超過 → dropped = 0", () => {
    expect(ok(lineFile(body), 10).dropped).toBe(0);
  });

  it("標準格式也一樣", () => {
    const r = ok("品妤：一\n柏翰：二\n詩涵：三", 2);
    expect(r.format).toBe("standard");
    expect(r.dropped).toBe(1);
    expect(r.transcript.messages.map((m) => m.text)).toEqual(["二", "三"]);
  });

  it("預設上限 300 句", () => {
    const many = Array.from({ length: 305 }, (_, i) => `品妤：${i}`).join("\n");
    const r = ok(many);
    expect(r.dropped).toBe(5);
    expect(r.transcript.messages).toHaveLength(300);
  });
});

describe("normalizeLineTime", () => {
  it.each([
    ["13:05", "13:05"],
    ["9:05", "09:05"],
    ["上午9:05", "09:05"],
    ["上午12:30", "00:30"],
    ["下午1:05", "13:05"],
    ["下午12:10", "12:10"],
    ["下午 11:59", "23:59"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeLineTime(raw)).toBe(expected);
  });
  it.each(["25:00", "12:60", "下午13:00", "上午0:10"])("不合法：%s → null", (raw) => {
    expect(normalizeLineTime(raw)).toBeNull();
  });
});

describe("parseLineExport", () => {
  it("每句帶有所在日期（之後 schema 加 date 時直接用）", () => {
    const lines = [
      ...HEADER,
      "2026/11/14（六）",
      msg("20:00", "品妤", "嗨"),
      "2026/11/16（一）",
      msg("13:00", "柏翰", "好"),
    ];
    expect(parseLineExport(lines).messages.map((m) => m.date)).toEqual([
      "2026-11-14",
      "2026-11-16",
    ]);
  });
});

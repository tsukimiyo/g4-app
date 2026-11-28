// LINE 聊天記錄匯出檔（.txt）的解析。owner：D
// 由 parse-txt.ts 的 parseTxt() 在第一行是「[LINE] …」時呼叫。純函式。
// 測試：tests/unit/parse-line.test.ts
//
// 匯出檔長這樣（繁體中文介面；欄位以 Tab 分隔）：
//
//   [LINE] 第4組期末專題的聊天記錄
//   儲存日期： 2026/11/28 14:18
//
//   2026/11/16（一）
//   13:05	品妤	教授的 feedback 我來整理
//   13:06	柏翰	[貼圖]
//   13:07		柏翰已收回訊息                  ← 系統訊息：名字欄是空的
//   13:08	詩涵	"prototype 畫面我做           ← 多行訊息用引號包起來，內文的 " 寫成 ""
//   會先做開工和回報那幾頁"
import type { TranscriptMessage } from "@/lib/schemas/transcript";

export type LineMessage = Pick<TranscriptMessage, "time" | "speakerRaw" | "text"> & {
  date: string | null; // 這句所在的日期（YYYY-MM-DD）
};

export type LineParseResult = { title: string | null; messages: LineMessage[] };

/** 第一行：[LINE] 第4組期末專題的聊天記錄 */
export const LINE_HEADER = /^\[LINE\]\s*(.*)$/;

/** 日期行：2026/11/16（一）、2026/11/16(一)、2026.11.16 星期一 */
const DATE_LINE =
  /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\s*(?:[（(][^）)]{1,3}[）)]|(?:星期|週)\S)?$/;

/** 一句訊息：時間<Tab>名字<Tab>內容。時間可能是 13:05 或 下午1:05 */
const MESSAGE = /^((?:上午|下午)?\s*\d{1,2}:\d{2})\t([^\t]*)\t(.*)$/;

/** 只有兩欄（時間<Tab>內容）的也是系統訊息 */
const TWO_COLUMNS = /^(?:上午|下午)?\s*\d{1,2}:\d{2}\t[^\t]*$/;

/** 不是討論內容的訊息：整則只有這些字就略過 */
const NOISE = new Set([
  "[貼圖]",
  "[照片]",
  "[影片]",
  "[檔案]",
  "[語音訊息]",
  "[相簿]",
  "[記事本]",
  "[位置資訊]",
  "[聯絡資訊]",
  "[投票]",
  "[禮物]",
  "[Sticker]",
  "[Photo]",
  "[Video]",
  "[File]",
  "[Voice message]",
  "[Album]",
  "[Note]",
  "[Location]",
  "[Contact]",
]);

/** LINE 的名字可能超過 20 字，schema 只收 20 字 */
const MAX_NAME_LENGTH = 20;

/**
 * 規則：
 * - 第一個日期行之前的內容（標題、儲存日期）只取標題，其餘略過
 * - 日期行 → 之後的訊息都屬於這一天
 * - 名字欄是空的、或只有兩欄 → 系統訊息（收回訊息、加入或退出群組…），略過
 * - 內容以 " 開頭、同一行沒有結束引號 → 多行訊息，一直接到以 " 結尾的那一行；"" 還原成 "
 * - 其他不符合格式的行 → 接到上一句後面（以換行連接）；空行略過
 * - 貼圖、照片、檔案等（NOISE）和通話紀錄（☎ 開頭）略過
 * - 時間：「下午1:05」→「13:05」、「上午12:30」→「00:30」；不合法的時間當作沒寫
 * - 名字超過 20 字只取前 20 字
 * 輸入是已經去掉 BOM、切好行的內容；行號與錯誤處理由 parseTxt() 負責
 */
export function parseLineExport(lines: string[]): LineParseResult {
  const firstLine = lines.find((l) => l.trim() !== "")?.trim() ?? "";
  const title = parseTitle(firstLine);

  const messages: (LineMessage & { quoted: boolean })[] = [];
  let date: string | null = null;
  /** 最後一則可以接續內容的訊息；遇到系統訊息後為 null，後面的行不會接到更早的訊息 */
  let last: (LineMessage & { quoted: boolean }) | null = null;
  let inQuote = false;
  let seenDate = false;

  for (const raw of lines) {
    const line = raw.trim();

    // 多行訊息沒有結束引號就遇到下一則訊息（檔案被手動改過）→ 結束這則，照一般規則處理這行
    if (inQuote && MESSAGE.test(line)) inQuote = false;

    if (inQuote && last) {
      if (line === "") continue;
      if (endsWithClosingQuote(line)) {
        appendLine(last, line.slice(0, -1));
        inQuote = false;
      } else {
        appendLine(last, line);
      }
      continue;
    }

    if (line === "") continue;

    const d = DATE_LINE.exec(line);
    if (d) {
      date = toYmd(d[1]!, d[2]!, d[3]!);
      seenDate = true;
      last = null;
      continue;
    }

    const m = MESSAGE.exec(line);
    if (m) {
      const speakerRaw = Array.from(m[2]!.trim()).slice(0, MAX_NAME_LENGTH).join("");
      if (speakerRaw === "") {
        last = null; // 系統訊息
        continue;
      }
      let text = m[3]!.trim();
      let quoted = false;
      if (text.startsWith('"') && !(text.length > 1 && endsWithClosingQuote(text))) {
        text = text.slice(1);
        quoted = true;
        inQuote = true;
      }
      last = { date, time: normalizeLineTime(m[1]!), speakerRaw, text, quoted };
      messages.push(last);
      continue;
    }

    if (TWO_COLUMNS.test(line)) {
      last = null; // 系統訊息
      continue;
    }

    // 日期行之前的標題、儲存日期等
    if (!seenDate && !last) continue;
    if (last) appendLine(last, line);
  }

  return {
    title,
    messages: messages
      .map(({ quoted, ...msg }) => ({
        ...msg,
        text: (quoted ? msg.text.replaceAll('""', '"') : msg.text).trim(),
      }))
      .filter((msg) => msg.text !== "" && !isNoise(msg.text)),
  };
}

/** 「[LINE] 第4組期末專題的聊天記錄」→「第4組期末專題」 */
function parseTitle(firstLine: string): string | null {
  const h = LINE_HEADER.exec(firstLine);
  if (!h) return null;
  const name = h[1]!
    .replace(/的聊天記錄$/, "")
    .replace(/^Chat history (?:with|in)\s+/i, "")
    .trim();
  return name || null;
}

function appendLine(msg: LineMessage, line: string) {
  msg.text = msg.text === "" ? line : `${msg.text}\n${line}`;
}

/** 以奇數個 " 結尾（"" 是內文的引號，不算結束） */
function endsWithClosingQuote(s: string): boolean {
  const trailing = /"+$/.exec(s)?.[0].length ?? 0;
  return trailing % 2 === 1;
}

function isNoise(text: string): boolean {
  return NOISE.has(text) || text.startsWith("☎");
}

function toYmd(y: string, m: string, d: string): string | null {
  const ymd = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const t = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().startsWith(ymd) ? ymd : null;
}

/** 「13:05」「下午1:05」「上午12:30」→ HH:MM；不合法回 null */
export function normalizeLineTime(raw: string): string | null {
  const m = /^(上午|下午)?\s*(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  let h = Number(m[2]);
  const min = Number(m[3]);
  if (m[1] && (h < 1 || h > 12)) return null;
  if (m[1] === "下午" && h < 12) h += 12;
  if (m[1] === "上午" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[3]}`;
}

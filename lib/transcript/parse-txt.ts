// 逐字稿 .txt parser。owner：D
// 規格：docs/implementation-plan.md「Week 1 共用規格 → 1. 逐字稿 .txt 格式」
// 純函式，不碰資料庫、不用 AI。測試：tests/unit/parse-txt.test.ts、tests/unit/parse-line.test.ts
//
// 支援兩種格式，自動判斷：
// - LINE 聊天記錄匯出：第一行是「[LINE] …」→ parse-line.ts
// - 標準格式（手動整理）：「時間 名字：內容」，見本檔下方規則
import type {
  ParsedTranscript,
  TranscriptMessage,
  TranscriptParseError,
} from "@/lib/schemas/transcript";
import { toHm } from "@/lib/time";
import { LINE_HEADER, parseLineExport } from "./parse-line";

/** 第一行的標題列：# 2026-11-16 第 4 組期末專題分工 */
export const HEADER_LINE = /^#\s*(\d{4}-\d{2}-\d{2})?\s*(.*)$/;

/**
 * 一句發言：[HH:MM] 名字：內容
 * - 時間可省略，時間與名字之間的空白可有可無
 * - 冒號全形「：」或半形「:」都可以
 * - 名字 1–20 字，不能以空白或冒號開頭
 * - (?!\/\/) 避免把跨行的網址（https://...）誤判成發言者「https」
 */
export const MESSAGE_LINE =
  /^(?:(\d{1,2}:\d{2})\s*)?([^\s:：][^:：]{0,19}?)\s*[:：](?!\/\/)\s*(.+)$/;

/** 跟 MESSAGE_LINE 一樣，但名字超過 20 字：只用來在第一句之前給出更明確的錯誤 */
const LONG_NAME_LINE = /^(?:\d{1,2}:\d{2}\s*)?([^\s:：][^:：]{20,})[:：](?!\/\/)\s*\S/;

/**
 * 最多送幾句給 LLM。超過時只保留最後面的 MAX_MESSAGES 句（最新的結論在後面）。
 * 長逐字稿切塊（lib/transcript/chunk.ts，E）完成後可以調高或拿掉。
 */
export const MAX_MESSAGES = 300;

export type TranscriptFormat = "standard" | "line";

export type ParseResult =
  | {
      ok: true;
      transcript: ParsedTranscript;
      format: TranscriptFormat;
      /** 因為超過上限而略過的前面句數；0 = 全部保留。上傳 API 要告訴使用者 */
      dropped: number;
    }
  | { ok: false; error: TranscriptParseError };

type ParseOptions = { maxMessages?: number };

/** 還沒編號的一句（idx、memberId 由 parseTxt 統一補上） */
type RawMessage = Pick<TranscriptMessage, "time" | "speakerRaw" | "text">;

/** 錯誤訊息裡附上的原文最多幾個字 */
const CONTENT_PREVIEW = 100;

/**
 * 共同規則：
 * - 處理 \r\n、\r、開頭的 BOM
 * - 內容有 U+FFFD（用 UTF-8 讀 Big5 檔的亂碼）→ { ok: false, reason: "NOT_UTF8" }
 * - 整份沒有任何一句 → { ok: false, reason: "NO_MESSAGES" }
 * - 超過 maxMessages 句 → 只保留最後面的，dropped = 略過的句數
 * - idx 從 0 開始連續；memberId 一律先填 null，由 match-speakers 之後補上
 * - speakers：出現過的名字（去重、依第一次出現順序）
 * - LINE 格式：meetingDate = 最後一句所在的日期（換算「下週五」的依據）
 */
export function parseTxt(
  text: string,
  { maxMessages = MAX_MESSAGES }: ParseOptions = {},
): ParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);

  const badIdx = lines.findIndex((l) => l.includes("\uFFFD"));
  if (badIdx !== -1) return fail(badIdx, "NOT_UTF8", lines[badIdx]!);

  const firstLine = lines.find((l) => l.trim() !== "")?.trim() ?? "";
  const format: TranscriptFormat = LINE_HEADER.test(firstLine) ? "line" : "standard";

  let title: string | null;
  let meetingDate: string | null;
  let raw: RawMessage[];

  if (format === "line") {
    const parsed = parseLineExport(lines);
    title = parsed.title;
    raw = parsed.messages;
    meetingDate = parsed.messages.at(-1)?.date ?? null;
  } else {
    const parsed = parseStandard(lines);
    if (!parsed.ok) return parsed;
    ({ title, meetingDate, messages: raw } = parsed);
  }

  if (raw.length === 0) {
    return { ok: false, error: { line: 1, reason: "NO_MESSAGES", content: "" } };
  }

  const dropped = Math.max(0, raw.length - maxMessages);
  const messages: TranscriptMessage[] = raw.slice(dropped).map((m, idx) => ({
    idx,
    time: m.time,
    speakerRaw: m.speakerRaw,
    memberId: null,
    text: m.text,
  }));
  const speakers = [...new Set(messages.map((m) => m.speakerRaw))];

  return { ok: true, transcript: { title, meetingDate, messages, speakers }, format, dropped };
}

/**
 * 標準格式的規則：
 * - 第一行（略過開頭空行）符合 HEADER_LINE → 取出 meetingDate 與 title（日期可省略；不是合法日期則為 null）
 * - 符合 MESSAGE_LINE → 新的一句；時間補零成 HH:MM（"9:05" → "09:05"）；不合法的時間（25:00）當作沒寫
 * - 不符合 → 接到上一句後面（以換行連接）；空行略過
 * - 「明天 10:00 集合」這種時間裡的半形冒號不算名字後面的冒號（避免變成發言者「明天 10」）
 * - 第一句之前就出現不符合的行 → { ok: false, reason: "NO_MESSAGE_BEFORE_LINE", line }
 *   （那行看起來是名字超過 20 字的發言 → reason: "NAME_TOO_LONG"）
 */
function parseStandard(
  lines: string[],
):
  | { ok: true; title: string | null; meetingDate: string | null; messages: RawMessage[] }
  | { ok: false; error: TranscriptParseError } {
  let title: string | null = null;
  let meetingDate: string | null = null;
  const messages: RawMessage[] = [];
  let headerChecked = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line === "") continue;

    if (!headerChecked) {
      headerChecked = true;
      const h = HEADER_LINE.exec(line);
      if (h) {
        meetingDate = h[1] && isValidDate(h[1]) ? h[1] : null;
        title = (h[1] && !meetingDate ? `${h[1]} ${h[2] ?? ""}` : (h[2] ?? "")).trim() || null;
        continue;
      }
    }

    const m = matchMessage(line);
    if (m) {
      messages.push(m);
      continue;
    }

    const prev = messages.at(-1);
    if (!prev) {
      const reason = LONG_NAME_LINE.test(line) ? "NAME_TOO_LONG" : "NO_MESSAGE_BEFORE_LINE";
      return fail(i, reason, line);
    }
    prev.text += `\n${line}`;
  }

  return { ok: true, title, meetingDate, messages };
}

function matchMessage(line: string): RawMessage | null {
  const m = MESSAGE_LINE.exec(line);
  if (!m) return null;
  const [, rawTime, rawName, rawText] = m;
  const speakerRaw = rawName!.trim();
  const text = rawText!.trim();

  // 「明天 10:00 集合」：名字以數字結尾、內容以數字開頭、中間是半形冒號 → 是時間不是發言
  if (/\d$/.test(speakerRaw) && /^\d/.test(text) && /\d\s*:\s*\d/.test(line)) return null;

  return { time: rawTime ? normalizeTime(rawTime) : null, speakerRaw, text };
}

function normalizeTime(raw: string): string | null {
  const hm = toHm(raw);
  const [h, min] = hm.split(":").map(Number);
  return h! < 24 && min! < 60 ? hm : null;
}

function isValidDate(ymd: string): boolean {
  const d = new Date(`${ymd}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(ymd);
}

function fail(
  lineIdx: number,
  reason: TranscriptParseError["reason"],
  content: string,
): { ok: false; error: TranscriptParseError } {
  return {
    ok: false,
    error: { line: lineIdx + 1, reason, content: content.trim().slice(0, CONTENT_PREVIEW) },
  };
}

// 規格：docs/implementation-plan.md「Week 1 共用規格 → 2. 共用型別」
// ⚠️ 共用契約：修改前先在群組通知 A、D、E（見 CONTRIBUTING.md「共用檔案」）
import { z } from "zod";
import { hm, id, ymd } from "./common";

export const TranscriptMessage = z.object({
  idx: z.number().int().nonnegative(), // 第幾句，從 0 開始；LLM 的 evidence 就是它
  time: hm.nullable(), // "13:05"（parser 會把 "9:05" 補成 "09:05"）；沒寫時間為 null
  speakerRaw: z.string().min(1).max(20), // 逐字稿裡寫的名字
  memberId: id.nullable(), // 對應到的組員；非組員或未對應為 null
  text: z.string().min(1),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessage>;

export const ParsedTranscript = z.object({
  title: z.string().nullable(),
  meetingDate: ymd.nullable(), // 第一行沒寫就是 null，由上傳者在發言者對應頁補上
  messages: z.array(TranscriptMessage).min(1).max(2000),
  speakers: z.array(z.string()), // 出現過的名字（去重、依第一次出現順序）
});
export type ParsedTranscript = z.infer<typeof ParsedTranscript>;

/** parser 失敗時回報給上傳者的錯誤（行號從 1 開始，對應編輯器顯示的行號） */
export const TranscriptParseError = z.object({
  line: z.number().int().positive(),
  reason: z.enum(["NO_MESSAGE_BEFORE_LINE", "NO_MESSAGES", "NAME_TOO_LONG", "NOT_UTF8"]),
  content: z.string(),
});
export type TranscriptParseError = z.infer<typeof TranscriptParseError>;

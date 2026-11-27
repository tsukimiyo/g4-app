// POST /api/projects/[pid]/imports — 上傳 .txt 並解析
// owner：D（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx } from "@/lib/api/http";

export const POST = handle(async (_req: Request, ctx: Ctx<"pid">) => {
  const { pid } = await ctx.params;

  // 1. requireMember(pid)
  // 2. 讀 multipart 的 file：副檔名不是 .txt → 415 NOT_TXT；> 2 MB → 413 FILE_TOO_LARGE
  // 3. 用 TextDecoder('utf-8', { fatal: true }) 解碼；失敗 → 400 NOT_UTF8
  // 4. parseTxt()；失敗 → 422 TRANSCRIPT_INVALID（details = TranscriptParseError）
  // 5. insert transcript_imports（status = 'parsed'）＋ transcript_messages
  // 6. matchSpeakers()（套用 speaker_aliases）
  // 7. 回傳 ImportResult；原始檔不保存

  void [pid];
  return notImplemented("POST /api/projects/[pid]/imports");
});

// POST /api/imports/[iid]/extract — 呼叫 LLM 產生分工草稿
// owner：D（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx } from "@/lib/api/http";

export const POST = handle(async (_req: Request, ctx: Ctx<"iid">) => {
  const { iid } = await ctx.params;

  // 1. 查 import → requireMember；status 必須是 'mapped' 且 meeting_date 不為 null（否則 409）
  // 2. status = 'extracting' → extractDivision()（lib/agent，E 負責）
  // 3. 失敗 → status = 'failed'、回 502 LLM_FAILED（前端提示改走手動分配）
  // 4. insert division_drafts（source = 'txt'、version = 該專題最大版本 + 1、status = 'draft'、llm_raw）
  // 5. status = 'done'；回傳 DraftWithWarnings（validateDivision）

  void [iid];
  return notImplemented("POST /api/imports/[iid]/extract");
});

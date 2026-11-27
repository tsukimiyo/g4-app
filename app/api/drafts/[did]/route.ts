// PATCH /api/drafts/[did] — 儲存草稿調整並重跑規則檢查
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx, parseBody } from "@/lib/api/http";
import { UpdateDraftInput } from "@/lib/schemas/api";

export const PATCH = handle(async (req: Request, ctx: Ctx<"did">) => {
  const { did } = await ctx.params;
  const input = await parseBody(req, UpdateDraftInput);

  // 1. 查 draft → requireMember(draft.project_id)
  // 2. status 必須是 'draft'（pending 時要先有人「提出修改」退回 draft；否則 409 DRAFT_LOCKED）
  // 3. 更新 tasks / open_questions / updated_at
  // 4. 回傳 DraftWithWarnings

  void [did, input];
  return notImplemented("PATCH /api/drafts/[did]");
});

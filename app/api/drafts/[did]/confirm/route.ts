// POST /api/drafts/[did]/confirm — 組員確認或提出修改
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx, parseBody } from "@/lib/api/http";
import { ConfirmInput } from "@/lib/schemas/api";

export const POST = handle(async (req: Request, ctx: Ctx<"did">) => {
  const { did } = await ctx.params;
  const input = await parseBody(req, ConfirmInput);

  // 1. 查 draft → requireMember；status 必須是 'pending'
  // 2. change_requested → 刪除這份草稿所有 'confirmed' 的確認、upsert 自己的 change_requested（comment 留著給編輯的人看）、status 回到 'draft'
  //    （之後重新 submit 時，submit API 會清空這份草稿的所有確認）
  // 3. confirmed → upsert division_confirmations
  // 4. 全員確認（分母 = 送出時的組員數）→ 呼叫 SQL function activate_draft(draft_id)（同一個 transaction：寫入 tasks / task_assignees、舊版 superseded、刪除非依據訊息）
  // 5. 回傳 ConfirmResult

  void [did, input];
  return notImplemented("POST /api/drafts/[did]/confirm");
});

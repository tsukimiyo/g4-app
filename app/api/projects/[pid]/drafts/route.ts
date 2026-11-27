// POST /api/projects/[pid]/drafts — 手動分配：建立空白草稿
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx } from "@/lib/api/http";

export const POST = handle(async (_req: Request, ctx: Ctx<"pid">) => {
  const { pid } = await ctx.params;

  // 1. requireMember(pid)
  // 2. insert division_drafts（source = 'manual'、tasks = []、status = 'draft'）
  // 3. 回傳 DraftWithWarnings

  void [pid];
  return notImplemented("POST /api/projects/[pid]/drafts");
});

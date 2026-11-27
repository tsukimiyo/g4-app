// PUT /api/tasks/[tid]/frequency — 設定回報頻率
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx, parseBody } from "@/lib/api/http";
import { FrequencyInput } from "@/lib/schemas/api";

export const PUT = handle(async (req: Request, ctx: Ctx<"tid">) => {
  const { tid } = await ctx.params;
  const input = await parseBody(req, FrequencyInput);

  // 1. 查 task → requireMember(task.project_id)；必須是該任務負責人之一
  // 2. 更新 report_every_days、report_time
  // 3. 回傳 task

  void [tid, input];
  return notImplemented("PUT /api/tasks/[tid]/frequency");
});

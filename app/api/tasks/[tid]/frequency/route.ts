// PUT /api/tasks/[tid]/frequency — 設定回報頻率
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireMember, requireUser } from "@/lib/api/auth";
import { ApiError, handle, json, parseBody, type Ctx } from "@/lib/api/http";
import { FrequencyInput } from "@/lib/schemas/api";
import { id } from "@/lib/schemas/common";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { toHm } from "@/lib/time";

export const PUT = handle(async (req: Request, ctx: Ctx<"tid">) => {
  await requireUser();
  const tid = id.parse((await ctx.params).tid);
  const input = await parseBody(req, FrequencyInput);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.reportTime)) {
    throw new ApiError(400, "VALIDATION_FAILED", "回報時間不正確");
  }
  const db = createAdminClient();
  const { data: row, error: readError } = await db
    .from("tasks")
    .select("project_id")
    .eq("id", tid)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) throw new ApiError(404, "TASK_NOT_FOUND", "找不到這項任務");
  const { member } = await requireMember(row.project_id);
  // Recheck membership and assignment inside the same transaction as the update.
  const { data, error } = await db.rpc("set_task_frequency", {
    p_task_id: tid,
    p_member_id: member.id,
    p_days: input.reportEveryDays,
    p_time: input.reportTime,
  });
  if (error) {
    switch (error.message) {
      case "TASK_NOT_FOUND":
        throw new ApiError(404, "TASK_NOT_FOUND", "找不到這項任務");
      case "PROJECT_NOT_FOUND":
        throw new ApiError(404, "PROJECT_NOT_FOUND", "找不到這個專題");
      case "NOT_MEMBER":
        throw new ApiError(403, "NOT_MEMBER", "你不是這個專題的組員");
      case "NOT_ASSIGNEE":
        throw new ApiError(403, "NOT_ASSIGNEE", "你不是這項任務的負責人");
      case "TASK_INACTIVE":
        throw new ApiError(409, "TASK_INACTIVE", "此任務已不屬於目前生效的分工");
      case "FREQUENCY_INVALID":
        throw new ApiError(400, "VALIDATION_FAILED", "回報頻率或時間不正確");
      default:
        throw error;
    }
  }
  if (!data) throw new ApiError(500, "INTERNAL", "設定回報頻率失敗");
  const task = data as Database["public"]["Tables"]["tasks"]["Row"];
  return json({
    id: task.id,
    projectId: task.project_id,
    draftId: task.draft_id,
    title: task.title,
    deadline: task.deadline,
    progress: task.progress,
    reportEveryDays: task.report_every_days,
    reportTime: toHm(task.report_time),
    evidence: task.evidence,
    createdAt: task.created_at,
  });
});

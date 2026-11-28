// POST /api/join/[code] — 用邀請碼加入專題
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireUser } from "@/lib/api/auth";
import { ApiError, handle, json, parseBody, type Ctx } from "@/lib/api/http";
import { JoinInput } from "@/lib/schemas/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

export const POST = handle(async (req: Request, ctx: Ctx<"code">) => {
  const user = await requireUser();
  const { code } = await ctx.params;
  const input = await parseBody(req, JoinInput);
  if (!input.displayName.trim()) {
    throw new ApiError(400, "VALIDATION_FAILED", "顯示名稱不可只有空白");
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("join_project_by_invite", {
    p_code: code,
    p_user_id: user.id,
    p_display_name: input.displayName,
  });

  if (error) {
    if (error.code === "PT404" && error.message === "INVITE_INVALID") {
      throw new ApiError(404, "INVITE_INVALID", "邀請連結不存在或已過期");
    }
    if (error.code === "PT409" && error.message === "PROJECT_FULL") {
      throw new ApiError(409, "PROJECT_FULL", "專題人數已滿");
    }
    throw error;
  }

  if (!data) throw new ApiError(500, "INTERNAL", "加入專題失敗");
  const member = data as Database["public"]["Tables"]["members"]["Row"];

  // 新加入與重複加入使用同一個成功回應格式。
  return json({
    projectId: member.project_id,
    member: {
      id: member.id,
      projectId: member.project_id,
      userId: member.user_id,
      displayName: member.display_name,
      color: member.color,
      joinedAt: member.joined_at,
    },
  });
});

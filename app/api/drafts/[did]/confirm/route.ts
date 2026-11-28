// POST /api/drafts/[did]/confirm — 組員確認或提出修改
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireMember, requireUser } from "@/lib/api/auth";
import { ApiError, handle, json, parseBody, type Ctx } from "@/lib/api/http";
import { ConfirmInput, ConfirmResult } from "@/lib/schemas/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { failRpc, routeId } from "@/app/api/drafts/_shared";

export const POST = handle(async (req: Request, ctx: Ctx<"did">) => {
  await requireUser();
  const did = routeId((await ctx.params).did);
  const input = await parseBody(req, ConfirmInput);
  if (input.result === "change_requested" && !input.comment.trim()) {
    throw new ApiError(400, "VALIDATION_FAILED", "請填寫提出修改的原因");
  }
  const db = createAdminClient();
  // loadDraft() only allows draft status; confirm must load pending instead.
  const { data: row, error: readError } = await db
    .from("division_drafts")
    .select("project_id,status,updated_at")
    .eq("id", did)
    .maybeSingle();
  if (readError) throw readError;
  if (!row) throw new ApiError(404, "DRAFT_NOT_FOUND", "找不到這份草稿");
  const { member } = await requireMember(row.project_id);
  if (row.status !== "pending")
    throw new ApiError(409, "DRAFT_LOCKED", "只有等待確認中的草稿可以確認或提出修改");
  const { data, error } = await db.rpc("confirm_division_draft", {
    p_draft_id: did,
    p_member_id: member.id,
    p_expected_updated_at: row.updated_at,
    p_result: input.result,
    // PostgreSQL 只在 change_requested 使用留言；生成的 RPC 型別要求 string。
    p_comment: input.result === "change_requested" ? input.comment : "",
  });
  if (error) {
    if (error.message === "DRAFT_OUTDATED")
      throw new ApiError(409, "DRAFT_OUTDATED", "已有更新版本的分工生效，請重新建立草稿");
    if (["DRAFT_INVALID", "DRAFT_NOT_CONFIRMED"].includes(error.message))
      throw new ApiError(409, "DRAFT_INVALID", "草稿資料已不完整，請提出修改後重新送出");
    failRpc(error);
  }
  return json(ConfirmResult.parse(data));
});

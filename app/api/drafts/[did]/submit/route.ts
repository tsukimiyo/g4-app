// POST /api/drafts/[did]/submit — 送出全組確認
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireUser } from "@/lib/api/auth";
import { ApiError, handle, json, type Ctx } from "@/lib/api/http";
import { ConfirmResult } from "@/lib/schemas/api";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkTaskIntegrity,
  draftFromRow,
  failRpc,
  loadDraft,
  projectContext,
  routeId,
  warningsFor,
} from "@/app/api/drafts/_shared";

export const POST = handle(async (_req: Request, ctx: Ctx<"did">) => {
  await requireUser();
  const did = routeId((await ctx.params).did);
  const db = createAdminClient();
  const { row, member } = await loadDraft(db, did);
  const context = await projectContext(db, row.project_id);
  if (context.members.length < context.project.member_count) {
    throw new ApiError(409, "MEMBERS_NOT_JOINED", "組員尚未全部加入");
  }
  const draft = draftFromRow(row);
  await checkTaskIntegrity(db, row, draft.tasks, context.members);
  const warnings = warningsFor(draft.tasks, context);
  if (warnings.length)
    throw new ApiError(409, "DRAFT_HAS_WARNINGS", "請先處理所有分工警告", { warnings });
  const { data, error } = await db.rpc("submit_division_draft", {
    p_draft_id: did,
    p_member_id: member.id,
    p_expected_updated_at: row.updated_at,
    p_expected_members: context.members.map((m) => m.id),
    p_expected_final_deadline: context.project.final_deadline,
  });
  if (error) failRpc(error);
  return json(ConfirmResult.parse(data));
});

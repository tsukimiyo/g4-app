// PATCH /api/drafts/[did] — 儲存草稿調整並重跑規則檢查
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireUser } from "@/lib/api/auth";
import { handle, json, parseBody, type Ctx } from "@/lib/api/http";
import { UpdateDraftInput } from "@/lib/schemas/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  checkTaskIntegrity,
  draftResponse,
  failRpc,
  loadDraft,
  projectContext,
  routeId,
} from "@/app/api/drafts/_shared";

export const PATCH = handle(async (req: Request, ctx: Ctx<"did">) => {
  await requireUser();
  const did = routeId((await ctx.params).did);
  const db = createAdminClient();
  const { row, member } = await loadDraft(db, did);
  const input = await parseBody(req, UpdateDraftInput);
  const context = await projectContext(db, row.project_id);
  await checkTaskIntegrity(db, row, input.tasks, context.members);
  const { data, error } = await db.rpc("update_division_draft", {
    p_draft_id: did,
    p_member_id: member.id,
    p_expected_updated_at: row.updated_at,
    p_tasks: input.tasks,
    p_open_questions: input.openQuestions ?? row.open_questions,
  });
  if (error) failRpc(error);
  return json(
    draftResponse(data as Database["public"]["Tables"]["division_drafts"]["Row"], context),
  );
});

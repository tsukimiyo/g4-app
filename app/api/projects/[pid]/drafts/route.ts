// POST /api/projects/[pid]/drafts — 手動分配：建立空白草稿
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireMember } from "@/lib/api/auth";
import { ApiError, handle, json, type Ctx } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { draftResponse, failRpc, projectContext, routeId } from "@/app/api/drafts/_shared";

export const POST = handle(async (_req: Request, ctx: Ctx<"pid">) => {
  const pid = routeId((await ctx.params).pid);
  const { member } = await requireMember(pid);
  const db = createAdminClient();
  // A legacy AI writer may not yet take the project lock; retry a version collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db.rpc("create_manual_draft", {
      p_project_id: pid,
      p_member_id: member.id,
    });
    if (error?.code === "23505") continue;
    if (error) failRpc(error);
    const context = await projectContext(db, pid);
    return json(
      draftResponse(data as Database["public"]["Tables"]["division_drafts"]["Row"], context),
      201,
    );
  }
  throw new ApiError(409, "DRAFT_CHANGED", "草稿版本同時變更，請再試一次");
});

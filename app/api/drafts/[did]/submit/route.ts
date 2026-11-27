// POST /api/drafts/[did]/submit — 送出全組確認
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx } from "@/lib/api/http";

export const POST = handle(async (_req: Request, ctx: Ctx<"did">) => {
  const { did } = await ctx.params;

  // 1. 查 draft → requireMember；status 必須是 'draft'
  // 2. 加入人數 < projects.member_count → 409 MEMBERS_NOT_JOINED
  // 3. validateDivision() 有任何警告 → 409 DRAFT_HAS_WARNINGS（details = { warnings }）
  // 4. status = 'pending'；送出者自動算一票確認
  // 5. 回傳 ConfirmResult

  void [did];
  return notImplemented("POST /api/drafts/[did]/submit");
});

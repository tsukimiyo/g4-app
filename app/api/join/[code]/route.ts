// POST /api/join/[code] — 用邀請碼加入專題
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx, parseBody } from "@/lib/api/http";
import { JoinInput } from "@/lib/schemas/api";

export const POST = handle(async (req: Request, ctx: Ctx<"code">) => {
  const { code } = await ctx.params;
  const input = await parseBody(req, JoinInput);

  // 1. requireUser()
  // 2. 查 invites（不存在或過期 → 404 INVITE_INVALID）
  // 3. 已是組員 → 直接回傳該 member；人數已滿（= member_count）→ 409 PROJECT_FULL
  // 4. insert members（color 依加入順序取色盤）
  // 5. 回傳 { projectId, member }

  void [code, input];
  return notImplemented("POST /api/join/[code]");
});

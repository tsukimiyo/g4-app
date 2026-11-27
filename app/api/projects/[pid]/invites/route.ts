// POST /api/projects/[pid]/invites — 產生邀請連結
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx } from "@/lib/api/http";

export const POST = handle(async (_req: Request, ctx: Ctx<"pid">) => {
  const { pid } = await ctx.params;

  // 1. requireMember(pid)
  // 2. 產生 8 碼 code（例如 7K2Q-HCI），expires_at = 7 天後
  // 3. 回傳 { code, url: `${siteUrl}/join/${code}` }

  void [pid];
  return notImplemented("POST /api/projects/[pid]/invites");
});

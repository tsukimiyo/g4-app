// POST /api/cron/tick — 排程入口（每 5 分鐘由 Supabase pg_cron + pg_net 呼叫）
// owner：D（W2）
// 注意：Vercel Cron 的免費方案一天只能跑一次，不能當每 5 分鐘的備案。
import { ApiError, handle, json } from "@/lib/api/http";
import { serverEnv } from "@/lib/env";

export const POST = handle(async (req: Request) => {
  if (req.headers.get("authorization") !== `Bearer ${serverEnv.cronSecret()}`) {
    throw new ApiError(401, "UNAUTHORIZED", "cron secret 不正確");
  }
  // TODO(D, W2)：回報提醒、逾時判斷、倒數到期升級（lib/rules/event-machine.ts）
  return json({ ok: true, ranAt: new Date().toISOString() });
});

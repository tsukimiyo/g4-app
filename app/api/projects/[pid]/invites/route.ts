// POST /api/projects/[pid]/invites — 產生邀請連結
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { customAlphabet } from "nanoid";
import { requireMember } from "@/lib/api/auth";
import { handle, json, ApiError, type Ctx } from "@/lib/api/http";
import { publicEnv } from "@/lib/env";
import { id } from "@/lib/schemas/common";
import { createAdminClient } from "@/lib/supabase/admin";

const generateCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const POST = handle(async (_req: Request, ctx: Ctx<"pid">) => {
  const { pid } = await ctx.params;
  await requireMember(id.parse(pid));

  const db = createAdminClient();
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS).toISOString();

  // 唯一鍵碰撞時重新產生，不覆蓋現有邀請。
  for (let attempt = 0; attempt < 5; attempt++) {
    const raw = generateCode();
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    const url = new URL(`/join/${code}`, publicEnv.siteUrl()).toString();
    const { error } = await db.from("invites").insert({
      code,
      project_id: pid,
      expires_at: expiresAt,
    });

    if (!error) return json({ code, url }, 201);
    if (error.code !== "23505") throw error;
  }

  throw new ApiError(503, "INVITE_CODE_RETRY_EXHAUSTED", "暫時無法產生邀請碼，請稍後再試");
});

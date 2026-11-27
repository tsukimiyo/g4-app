// PUT /api/imports/[iid]/speakers — 確認發言者對應與討論日期
// owner：D（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, type Ctx, parseBody } from "@/lib/api/http";
import { SpeakerMappingInput } from "@/lib/schemas/api";

export const PUT = handle(async (req: Request, ctx: Ctx<"iid">) => {
  const { iid } = await ctx.params;
  const input = await parseBody(req, SpeakerMappingInput);

  // 1. 查 import → requireMember(import.project_id)
  // 2. 更新 transcript_messages.member_id；upsert speaker_aliases
  // 3. 更新 transcript_imports.meeting_date、status = 'mapped'
  // 4. 回傳 { ok: true }

  void [iid, input];
  return notImplemented("PUT /api/imports/[iid]/speakers");
});

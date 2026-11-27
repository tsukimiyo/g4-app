// LLM 輸出的 schema。owner：E
// ⚠️ 共用契約：修改前先通知 A、C（草稿畫面與 API 依賴轉換後的 DraftTask）
//
// 這份 schema 會用 @anthropic-ai/sdk 的 zodOutputFormat() 轉成 structured outputs 的 JSON schema。
// structured outputs 不一定支援所有 zod 限制（regex、min/max 等），所以這裡刻意寫得寬鬆，
// 嚴格的檢查放在 toDraftTasks()（lib/agent/to-draft-tasks.ts）：
//   - memberId 不在名單 → 移除那位 owner
//   - evidence 為空或編號不存在 → 整個任務丟掉
//   - deadline 不是 YYYY-MM-DD → 設為 null（保留 deadlineText）
import { z } from "zod";

export const LlmDivisionOutput = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      owners: z.array(
        z.object({
          memberId: z.string(),
          part: z.string().nullable(),
        }),
      ),
      deadline: z.string().nullable(), // 預期 YYYY-MM-DD
      deadlineText: z.string().nullable(),
      evidence: z.array(z.number().int()), // 至少一個，由 toDraftTasks 檢查
      confidence: z.enum(["high", "low"]),
    }),
  ),
  unassignedMembers: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
export type LlmDivisionOutput = z.infer<typeof LlmDivisionOutput>;

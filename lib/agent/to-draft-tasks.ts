// LLM 輸出 → DraftTask[] 的轉換與過濾。owner：E
// 純函式，請在 tests/unit/to-draft-tasks.test.ts 補上單元測試。
import type { LlmDivisionOutput } from "@/lib/agent/schemas/extract-division";
import type { DraftTask } from "@/lib/schemas/division";

export type ToDraftTasksContext = {
  memberIds: Set<string>;
  messageCount: number; // 有效的 evidence 範圍是 0..messageCount-1
  newKey: () => string; // 通常傳 nanoid
};

/**
 * 規則（見 implementation-plan「LLM 的輸入與輸出」）：
 * - owners 裡 memberId 不在名單的 → 移除該 owner
 * - evidence 移除不存在的編號；移除後為空 → 整個任務丟掉
 * - deadline 不是 YYYY-MM-DD → 改成 null，保留 deadlineText
 * - 補上 key；taskId = null；reportEveryDays = null；reportTime = "21:00"
 */
export function toDraftTasks(_output: LlmDivisionOutput, _ctx: ToDraftTasksContext): DraftTask[] {
  // TODO(E)
  throw new Error("toDraftTasks 尚未實作");
}

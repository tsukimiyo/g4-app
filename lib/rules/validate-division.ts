// 分工規則檢查。owner：D
// 前後端共用：前端即時顯示警告、API 在 PATCH / submit 時重算。所以這裡不能 import 任何伺服器端模組。
// 測試：tests/unit/validate-division.test.ts
import type { DivisionWarning, DraftTask } from "@/lib/schemas/division";

export type ValidateDivisionInput = {
  tasks: DraftTask[];
  members: { id: string }[];
  finalDeadline: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD（Asia/Taipei，用 lib/time.ts 的 todayInTaipei()）；當參數傳入方便測試
};

/**
 * 產生的警告（任何一個存在都不能送出）：
 * - MEMBER_NO_TASK：有組員沒出現在任何任務的 assignees（memberId）
 * - TASK_NO_ASSIGNEE：assignees 為空（taskKey）
 * - DEADLINE_MISSING：deadline 為 null（taskKey）
 * - DEADLINE_PAST：deadline < today（taskKey）
 * - DEADLINE_AFTER_FINAL：deadline > finalDeadline（taskKey）
 * - DUPLICATE_TITLE：標題去掉前後空白後相同（每個重複的 taskKey 各一則）
 */
export function validateDivision(_input: ValidateDivisionInput): DivisionWarning[] {
  // TODO(D)
  throw new Error("validateDivision 尚未實作");
}

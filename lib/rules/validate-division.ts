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
 *
 * 順序固定（前端可直接照順序顯示）：先依組員順序列 MEMBER_NO_TASK，
 * 再依任務順序，每個任務內依上面列出的順序。
 * YYYY-MM-DD 可以直接用字串比大小。
 */
export function validateDivision({
  tasks,
  members,
  finalDeadline,
  today,
}: ValidateDivisionInput): DivisionWarning[] {
  const warnings: DivisionWarning[] = [];

  const assigned = new Set(tasks.flatMap((t) => t.assignees.map((a) => a.memberId)));
  for (const m of members) {
    if (!assigned.has(m.id)) warnings.push({ code: "MEMBER_NO_TASK", memberId: m.id });
  }

  const titleCount = new Map<string, number>();
  for (const t of tasks) {
    const title = t.title.trim();
    titleCount.set(title, (titleCount.get(title) ?? 0) + 1);
  }

  for (const t of tasks) {
    const taskKey = t.key;
    if (t.assignees.length === 0) warnings.push({ code: "TASK_NO_ASSIGNEE", taskKey });
    if (t.deadline === null) {
      warnings.push({ code: "DEADLINE_MISSING", taskKey });
    } else {
      if (t.deadline < today) warnings.push({ code: "DEADLINE_PAST", taskKey });
      if (t.deadline > finalDeadline) warnings.push({ code: "DEADLINE_AFTER_FINAL", taskKey });
    }
    if (titleCount.get(t.title.trim())! > 1) warnings.push({ code: "DUPLICATE_TITLE", taskKey });
  }

  return warnings;
}

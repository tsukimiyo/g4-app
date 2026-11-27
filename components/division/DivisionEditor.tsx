"use client";
// 分工調整的核心元件。owner：A
// 之後求助、協調、助教介入都會重用，所以只接收資料與 callback，不要在裡面直接 fetch。
//
// 開發順序建議：先用 mocks/division-draft.json 與 mocks/members.json 做畫面，
// 不用等 API；警告用 validateDivision() 在前端即時算（D 完成前可先回傳 []）。
import type { DivisionWarning, DraftTask } from "@/lib/schemas/division";

export type DivisionEditorProps = {
  tasks: DraftTask[];
  members: { id: string; displayName: string; color: string }[];
  warnings: DivisionWarning[];
  /** 依據訊息（展開「依據」時顯示）；手動分配時為空 */
  messagesByIdx?: Map<number, { speakerRaw: string; time: string | null; text: string }>;
  onChange: (tasks: DraftTask[]) => void;
  readOnly?: boolean;
};

export function DivisionEditor({ tasks, members, warnings }: DivisionEditorProps) {
  // TODO(A)：任務卡片、未指派選人（AssigneePicker）、改截止日、新增任務、多人負責、警告橫幅
  return (
    <div className="space-y-2 rounded border border-dashed border-line p-4 text-sm text-ink-muted">
      DivisionEditor（尚未實作）：{tasks.length} 項任務、{members.length} 位組員、
      {warnings.length} 則警告
    </div>
  );
}

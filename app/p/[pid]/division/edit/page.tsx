"use client";

// 分工調整頁。owner：A（W1）
// 11/28：使用 Mock JSON 完成分工調整功能。
// 11/29：串接正式草稿讀取、自動儲存及送出 API。

import { useState } from "react";

import { DivisionEditor } from "@/components/division/DivisionEditor";

import { DraftWithWarnings, type DivisionWarning, type DraftTask } from "@/lib/schemas/division";

import mockDraftJson from "@/mocks/division-draft.json";
import mockMembersJson from "@/mocks/members.json";

// 使用共用 Zod Schema 驗證 Mock JSON，
// 避免直接使用型別斷言掩蓋資料格式問題。
const initialData = DraftWithWarnings.parse(mockDraftJson);

const members = mockMembersJson.members;
const finalDeadline = mockMembersJson.finalDeadline;

// 取得台灣當地日期，格式為 YYYY-MM-DD。
// 正式整合時可改用團隊共用的 todayInTaipei()。
function getTodayInTaipei(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// MOCK ONLY：暫時的前端驗證函數。
// D 的 validateDivision() 完成後，應移除此函數，
// 改用正式共用驗證函數。
function validateMockDivision(tasks: DraftTask[], today: string): DivisionWarning[] {
  const warnings: DivisionWarning[] = [];

  // 1. MEMBER_NO_TASK
  // 檢查是否有組員尚未分配到任何任務。
  for (const member of members) {
    const hasTask = tasks.some((task) =>
      task.assignees.some((assignee) => assignee.memberId === member.id),
    );

    if (!hasTask) {
      warnings.push({
        code: "MEMBER_NO_TASK",
        memberId: member.id,
      });
    }
  }

  // 預先計算任務名稱出現次數。
  const titleCounts = new Map<string, number>();

  for (const task of tasks) {
    const title = task.title.trim();

    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }

  // 檢查每一項任務。
  for (const task of tasks) {
    // 2. TASK_NO_ASSIGNEE
    if (task.assignees.length === 0) {
      warnings.push({
        code: "TASK_NO_ASSIGNEE",
        taskKey: task.key,
      });
    }

    // 3. DEADLINE_MISSING
    if (task.deadline === null) {
      warnings.push({
        code: "DEADLINE_MISSING",
        taskKey: task.key,
      });
    } else {
      // 4. DEADLINE_PAST
      if (task.deadline < today) {
        warnings.push({
          code: "DEADLINE_PAST",
          taskKey: task.key,
        });
      }

      // 5. DEADLINE_AFTER_FINAL
      if (task.deadline > finalDeadline) {
        warnings.push({
          code: "DEADLINE_AFTER_FINAL",
          taskKey: task.key,
        });
      }
    }

    // 6. DUPLICATE_TITLE
    if ((titleCounts.get(task.title.trim()) ?? 0) > 1) {
      warnings.push({
        code: "DUPLICATE_TITLE",
        taskKey: task.key,
      });
    }
  }

  return warnings;
}

export default function Page() {
  // 任務資料的唯一狀態來源。
  const [tasks, setTasks] = useState<DraftTask[]>(initialData.draft.tasks);

  // Mock 送出確認狀態。
  const [submitted, setSubmitted] = useState(false);

  const [today] = useState(getTodayInTaipei);

  // 每次任務資料改變時重新計算警告。
  const warnings = validateMockDivision(tasks, today);

  const canSubmit = tasks.length > 0 && members.length > 0 && warnings.length === 0;

  // 更新任務資料。
  function handleTasksChange(nextTasks: DraftTask[]) {
    setTasks(nextTasks);
    setSubmitted(false);
  }

  // MOCK ONLY：模擬送出確認。
  // 尚未呼叫 POST /api/drafts/[did]/submit。
  function handleSubmit() {
    if (!canSubmit || submitted) return;

    setSubmitted(true);
  }

  // 將頁面恢復成初始 Mock 資料，方便反覆測試。
  function handleReset() {
    setTasks(initialData.draft.tasks);
    setSubmitted(false);
  }

  return (
    <main className="mx-auto w-full max-w-[480px] space-y-4 px-4 py-5 text-ink">
      {/* 頁面標題 */}
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">分工調整</h1>

          <span className="rounded-md bg-surface-muted px-2 py-1 text-xs text-ink-muted">
            Mock 模式
          </span>
        </div>

        <p className="text-sm text-ink-muted">
          {submitted ? "已模擬送出確認" : "初步分工｜尚未確認"}
        </p>
      </header>

      <div className="border-t border-line" />

      {/* Agent 開場訊息 */}
      <section aria-label="Agent 分工說明" className="flex items-start gap-2">
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
        >
          A
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">Agent</p>

          <div className="rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed">
            {submitted ? (
              <p>分工已完成模擬送出。正式的全組確認流程將在 API 串接完成後啟用。</p>
            ) : (
              <p>
                已整理出 {tasks.length} 項任務。
                {warnings.length > 0
                  ? "請確認負責人與截止日期，處理所有分工警告後即可送出全組確認。"
                  : "目前分工沒有警告，可以送出全組確認。"}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* 分工核心元件 */}
      <DivisionEditor
        tasks={tasks}
        members={members}
        warnings={warnings}
        onChange={handleTasksChange}
        readOnly={submitted}
      />

      {/* Mock 送出確認結果 */}
      {submitted && (
        <section role="status" className="space-y-2 rounded-xl border border-ok bg-ok/10 p-4">
          <p className="text-sm font-semibold text-ok">✓ Mock 測試：分工已送出確認</p>

          <p className="text-xs leading-relaxed text-ink-muted">
            目前僅模擬前端送出成功，沒有呼叫 API， 也沒有將資料寫入 Supabase。
          </p>

          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink"
          >
            返回修改分工
          </button>
        </section>
      )}

      {/* 頁面底部操作 */}
      {!submitted && (
        <section className="space-y-2 border-t border-line pt-4">
          {!canSubmit && (
            <p aria-live="polite" className="text-center text-xs text-ink-muted">
              {warnings.length > 0
                ? `尚有 ${warnings.length} 則警告，請先完成分工調整。`
                : "請至少建立一項任務並確認組員資料。"}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            送出全組確認
          </button>
        </section>
      )}

      {/* 僅供目前 Mock 開發測試使用 */}
      <section className="space-y-2 rounded-xl border border-dashed border-line bg-surface-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-ink-muted">開發測試工具</p>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
          >
            重設假資料
          </button>
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          目前使用本機 Mock JSON，不需要 API Key。 重新整理頁面會恢復初始資料。
        </p>

        <p className="text-xs text-ink-muted">
          任務：{tasks.length} 項 · 組員：{members.length} 位 · 警告：{warnings.length} 則
        </p>

        <p className="text-xs text-ink-muted">專題最終截止日：{finalDeadline}</p>
      </section>
    </main>
  );
}

"use client";

// 分工調整的核心元件。owner：A
// 只接收資料與 callback，不直接 fetch API。
// 後續求助、協調、助教介入及確認頁面皆可重用。

import { useId, useState } from "react";
import { nanoid } from "nanoid";

import type { Assignee, DivisionWarning, DraftTask } from "@/lib/schemas/division";

import { AssigneePicker } from "./AssigneePicker";
import { CoverageBar } from "./CoverageBar";

export type DivisionEditorProps = {
  tasks: DraftTask[];
  members: {
    id: string;
    displayName: string;
    color: string;
  }[];
  warnings: DivisionWarning[];
  messagesByIdx?: Map<
    number,
    {
      speakerRaw: string;
      time: string | null;
      text: string;
    }
  >;
  onChange: (tasks: DraftTask[]) => void;
  readOnly?: boolean;
};

// 將警告代碼轉換成使用者看得懂的文字。
function warningText(
  warning: DivisionWarning,
  tasks: DivisionEditorProps["tasks"],
  members: DivisionEditorProps["members"],
): string {
  const member = members.find((item) => item.id === warning.memberId);

  const task = tasks.find((item) => item.key === warning.taskKey);

  const memberName = member?.displayName ?? "有組員";
  const taskName = task?.title ?? "某項任務";

  switch (warning.code) {
    case "MEMBER_NO_TASK":
      return `${memberName} 尚無工作`;

    case "TASK_NO_ASSIGNEE":
      return `「${taskName}」無負責人`;

    case "DEADLINE_MISSING":
      return `「${taskName}」未設截止日`;

    case "DEADLINE_PAST":
      return `「${taskName}」的截止日已過`;

    case "DEADLINE_AFTER_FINAL":
      return `「${taskName}」超過專題最終截止日`;

    case "DUPLICATE_TITLE":
      return `「${taskName}」的任務名稱重複`;
  }
}

// 建立符合共用 Schema 的空白任務。
function createTask(): DraftTask {
  return {
    key: nanoid(),
    taskId: null,
    title: "",
    assignees: [],
    deadline: null,
    deadlineText: null,
    evidence: [],
    confidence: null,
    reportEveryDays: null,
    reportTime: "21:00",
  };
}

export function DivisionEditor({
  tasks,
  members,
  warnings,
  messagesByIdx,
  onChange,
  readOnly = false,
}: DivisionEditorProps) {
  const editorId = useId();

  // 目前正在指派負責人的任務。
  const [editingKey, setEditingKey] = useState<string | null>(null);

  // 選人時先暫存，按下完成指派後才更新正式資料。
  const [pendingAssignees, setPendingAssignees] = useState<Assignee[]>([]);

  // 新增任務使用獨立的暫存資料。
  const [newTask, setNewTask] = useState<DraftTask | null>(null);

  // 記錄本次編輯期間由使用者新增的任務。
  // 初始載入的任務不在此清單中，因此不能刪除。
  const [addedTaskKeys, setAddedTaskKeys] = useState<string[]>([]);

  // 根據所有任務計算組員是否已有工作。
  const memberCoverage = members.map((member) => ({
    ...member,
    hasTask: tasks.some((task) =>
      task.assignees.some((assignee) => assignee.memberId === member.id),
    ),
  }));

  const editingTask = tasks.find((task) => task.key === editingKey);

  // 更新指定任務，並保留其他欄位。
  function updateTask(taskKey: string, changes: Partial<DraftTask>) {
    if (readOnly) return;

    onChange(tasks.map((task) => (task.key === taskKey ? { ...task, ...changes } : task)));
  }

  // 開啟負責人選擇介面。
  function openAssigneePicker(task: DraftTask) {
    if (readOnly) return;

    setPendingAssignees(
      task.assignees.map((assignee) => ({
        ...assignee,
      })),
    );

    setEditingKey(task.key);
  }

  // 取消指派，不修改原本的任務。
  function closeAssigneePicker() {
    setEditingKey(null);
    setPendingAssignees([]);
  }

  // 完成負責人指派。
  function confirmAssignees() {
    if (readOnly || !editingTask) return;

    updateTask(editingTask.key, {
      assignees: pendingAssignees,
    });

    closeAssigneePicker();
  }

  // 新增任務。
  function addTask() {
    if (readOnly || !newTask) return;

    const title = newTask.title.trim();

    if (!title || title.length > 40) return;

    const taskToAdd: DraftTask = {
      ...newTask,
      title,
    };

    // 記錄使用者新增的任務 key。
    setAddedTaskKeys((previous) => [...previous, taskToAdd.key]);

    onChange([...tasks, taskToAdd]);

    setNewTask(null);
  }

  // 只允許刪除本次編輯期間新增的任務。
  function deleteTask(taskKey: string) {
    if (readOnly) return;

    // 初始任務不允許刪除。
    if (!addedTaskKeys.includes(taskKey)) return;

    const task = tasks.find((item) => item.key === taskKey);

    if (!task) return;

    const confirmed = window.confirm(`確定要刪除「${task.title}」嗎？`);

    if (!confirmed) return;

    onChange(tasks.filter((item) => item.key !== taskKey));

    setAddedTaskKeys((previous) => previous.filter((key) => key !== taskKey));

    if (editingKey === taskKey) {
      closeAssigneePicker();
    }
  }

  // 指派負責人的獨立子介面。
  if (!readOnly && editingTask) {
    return (
      <section className="space-y-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={closeAssigneePicker}
            className="text-sm font-medium text-ink-muted"
          >
            ← 返回分工調整
          </button>

          <h2 className="text-xl font-semibold text-ink">指派負責人</h2>

          <p className="text-sm text-ink-muted">
            {editingTask.title} ｜ 截止 {editingTask.deadline ?? "尚未設定"}
          </p>
        </div>

        <AssigneePicker
          value={pendingAssignees}
          members={memberCoverage}
          onChange={setPendingAssignees}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={closeAssigneePicker}
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink"
          >
            取消
          </button>

          <button
            type="button"
            onClick={confirmAssignees}
            className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
          >
            完成指派
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="分工調整" className="space-y-4">
      {/* 分工警告橫幅 */}
      {warnings.length > 0 ? (
        <div role="status" className="space-y-2 rounded-xl border border-warn bg-warn-soft p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span aria-hidden="true">⚠</span>
            分工不完整
          </p>

          <ul className="space-y-1 text-sm text-ink">
            {warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${warning.memberId ?? ""}-${warning.taskKey ?? ""}-${index}`}
                className="flex items-start gap-2"
              >
                <span aria-hidden="true">•</span>

                <span>{warningText(warning, tasks, members)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : tasks.length > 0 && members.length > 0 ? (
        <div role="status" className="rounded-xl border border-ok bg-ok/10 p-3">
          <p className="text-sm font-semibold text-ok">
            {readOnly ? "✓ 分工已完整" : "✓ 分工已完整，可以送出確認"}
          </p>
        </div>
      ) : null}

      {/* 任務清單 */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {tasks.length === 0 && (
          <p className="p-4 text-center text-sm text-ink-muted">目前還沒有任務</p>
        )}

        <ul className="divide-y divide-dashed divide-line">
          {tasks.map((task) => {
            const hasDeadlineWarning = warnings.some(
              (warning) =>
                warning.taskKey === task.key &&
                (warning.code === "DEADLINE_MISSING" ||
                  warning.code === "DEADLINE_PAST" ||
                  warning.code === "DEADLINE_AFTER_FINAL"),
            );

            const canDelete = !readOnly && addedTaskKeys.includes(task.key);

            const deadlineId = `${editorId}-deadline-${task.key}`;

            return (
              <li key={task.key} className="space-y-3 p-3">
                {/* 任務名稱與負責人 */}
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2">
                  {/* 左側：任務名稱 */}
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-ink">{task.title}</h3>

                    {task.confidence === "low" && (
                      <span className="mt-1 inline-block rounded bg-warn-soft px-1.5 py-0.5 text-xs text-ink">
                        AI 判斷待確認
                      </span>
                    )}
                  </div>

                  {/* 右側：負責人，每兩人換行 */}
                  <button
                    type="button"
                    disabled={readOnly}
                    aria-label={`修改 ${task.title} 的負責人`}
                    onClick={() => openAssigneePicker(task)}
                    className={[
                      "grid min-w-0 w-full grid-cols-2",
                      "justify-items-end items-start",
                      "gap-x-1 gap-y-1.5 rounded-lg",
                      "focus-visible:outline-2",
                      "focus-visible:outline-brand",
                      readOnly ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    {task.assignees.length === 0 ? (
                      <span className="col-span-2 justify-self-end rounded-full border border-warn bg-warn-soft px-2 py-1 text-xs font-medium text-ink">
                        {readOnly ? "未指派" : "未指派 ＋"}
                      </span>
                    ) : (
                      task.assignees.map((assignee, index) => {
                        const member = members.find((item) => item.id === assignee.memberId);

                        const name = member?.displayName ?? "未知組員";

                        // 奇數位負責人時，
                        // 最後一位固定靠右。
                        const isLastOdd =
                          task.assignees.length % 2 === 1 && index === task.assignees.length - 1;

                        return (
                          <span
                            key={assignee.memberId}
                            className={[
                              "inline-flex min-w-0 max-w-full",
                              "items-center justify-end gap-1",
                              "rounded-full bg-surface-muted",
                              "px-1.5 py-1 text-xs text-ink",
                              isLastOdd ? "col-start-2" : "",
                            ].join(" ")}
                          >
                            <span
                              aria-hidden="true"
                              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink-muted text-xs font-medium text-white"
                              style={{
                                backgroundColor: member?.color,
                              }}
                            >
                              {Array.from(name)[0] ?? "?"}
                            </span>

                            <span className="min-w-0 break-all text-right">{name}</span>
                          </span>
                        );
                      })
                    )}
                  </button>
                </div>

                {/* 多人負責：工作細項置左、姓名置右 */}
                {task.assignees.length > 1 && (
                  <ul className="space-y-2 rounded-lg bg-surface-muted p-2.5">
                    {task.assignees.map((assignee) => {
                      const member = members.find((item) => item.id === assignee.memberId);

                      return (
                        <li
                          key={assignee.memberId}
                          className="flex items-start justify-between gap-3 text-xs"
                        >
                          {/* 左側：各自負責的部分 */}
                          <span className="min-w-0 flex-1 break-words text-ink-muted">
                            {assignee.part?.trim() || "共同負責"}
                          </span>

                          {/* 右側：組員姓名 */}
                          <span className="max-w-[40%] shrink-0 break-all text-right font-medium text-ink">
                            {member?.displayName ?? "未知組員"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* 截止日 */}
                <div className="flex flex-wrap items-center gap-2">
                  {readOnly ? (
                    <>
                      <span className="text-xs text-ink-muted">截止</span>

                      <span
                        className={[
                          "text-sm",
                          hasDeadlineWarning ? "font-medium text-warn" : "text-ink",
                        ].join(" ")}
                      >
                        {task.deadline ?? "尚未設定"}
                      </span>
                    </>
                  ) : (
                    <>
                      <label htmlFor={deadlineId} className="text-xs text-ink-muted">
                        截止
                      </label>

                      <input
                        id={deadlineId}
                        type="date"
                        value={task.deadline ?? ""}
                        aria-label={`${task.title} 的截止日`}
                        aria-invalid={hasDeadlineWarning}
                        onChange={(event) =>
                          updateTask(task.key, {
                            deadline: event.target.value || null,
                          })
                        }
                        className={[
                          "min-w-0 max-w-full rounded-lg border",
                          "px-2 py-1.5 bg-surface text-sm text-ink",
                          "focus:border-brand focus:outline-none",
                          hasDeadlineWarning ? "border-warn" : "border-line",
                        ].join(" ")}
                      />
                    </>
                  )}

                  {!task.deadline && !readOnly && (
                    <span className="text-xs text-warn">尚未設定</span>
                  )}
                </div>

                {/* 逐字稿中的原始截止日文字 */}
                {task.deadlineText && (
                  <p className="text-xs text-ink-muted">原始討論：{task.deadlineText}</p>
                )}

                {/* AI 抽取依據 */}
                {task.evidence.length > 0 && (
                  <details className="rounded-lg bg-surface-muted p-2">
                    <summary className="cursor-pointer text-xs font-medium text-ink-muted">
                      查看依據（{task.evidence.length} 則）
                    </summary>

                    <div className="mt-2 space-y-2">
                      {task.evidence.map((idx, index) => {
                        const message = messagesByIdx?.get(idx);

                        return (
                          <div
                            key={`${idx}-${index}`}
                            className="rounded border border-line bg-surface p-2"
                          >
                            {message ? (
                              <>
                                <p className="text-xs font-medium text-ink">
                                  {message.speakerRaw}

                                  {message.time ? ` · ${message.time}` : ""}
                                </p>

                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
                                  {message.text}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-ink-muted">
                                訊息 #{idx}
                                （尚未載入原始逐字稿）
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                {/* 只有使用者新增的任務可以刪除 */}
                {canDelete && (
                  <div className="flex items-center justify-between gap-2 border-t border-dashed border-line pt-2">
                    <span className="text-xs text-ink-muted"></span>

                    <button
                      type="button"
                      onClick={() => deleteTask(task.key)}
                      aria-label={`刪除 ${task.title}`}
                      className={[
                        "shrink-0 rounded-lg border border-danger",
                        "px-2.5 py-1.5 text-xs font-medium text-danger",
                        "transition-colors hover:bg-danger-soft",
                        "focus-visible:outline-2",
                        "focus-visible:outline-danger",
                      ].join(" ")}
                    >
                      刪除任務
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* 新增任務按鈕 */}
        {!readOnly && !newTask && (
          <div className="border-t border-line p-3">
            <button
              type="button"
              onClick={() => setNewTask(createTask())}
              className="w-full rounded-lg border border-dashed border-line px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              ＋ 新增任務
            </button>
          </div>
        )}
      </div>

      {/* 新增任務表單 */}
      {!readOnly && newTask && (
        <div className="space-y-4 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold text-ink">新增任務</h3>

          {/* 任務名稱 */}
          <div className="space-y-1">
            <label
              htmlFor={`${editorId}-new-task-title`}
              className="block text-sm font-medium text-ink"
            >
              任務名稱
            </label>

            <input
              id={`${editorId}-new-task-title`}
              type="text"
              maxLength={40}
              value={newTask.title}
              placeholder="請輸入"
              onChange={(event) =>
                setNewTask({
                  ...newTask,
                  title: event.target.value,
                })
              }
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />

            <p className="text-right text-xs text-ink-muted">{newTask.title.length}/40</p>
          </div>

          {/* 截止日期 */}
          <div className="space-y-1">
            <label
              htmlFor={`${editorId}-new-task-deadline`}
              className="block text-sm font-medium text-ink"
            >
              截止日
            </label>

            <input
              id={`${editorId}-new-task-deadline`}
              type="date"
              value={newTask.deadline ?? ""}
              onChange={(event) =>
                setNewTask({
                  ...newTask,
                  deadline: event.target.value || null,
                })
              }
              className="w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>

          {/* 負責人選擇 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-ink">負責人</h4>

            <AssigneePicker
              value={newTask.assignees}
              members={memberCoverage}
              onChange={(assignees) =>
                setNewTask({
                  ...newTask,
                  assignees,
                })
              }
            />
          </div>

          <p className="text-xs leading-relaxed text-ink-muted">
            可以先新增尚未指派負責人或尚未設定截止日的任務， 但必須完成所有必要資料才能送出確認。
          </p>

          {/* 新增任務操作按鈕 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewTask(null)}
              className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink"
            >
              取消
            </button>

            <button
              type="button"
              disabled={!newTask.title.trim()}
              onClick={addTask}
              className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              新增任務
            </button>
          </div>
        </div>
      )}

      {/* 操作說明 */}
      {!readOnly && (
        <p className="text-xs leading-relaxed text-ink-muted">
          點擊負責人可以修改指派，截止日可以直接編輯。 一項任務可以有多位負責人。
          只有手動新增的任務可以刪除。
        </p>
      )}

      {/* 組員工作覆蓋狀態 */}
      <CoverageBar members={memberCoverage} />
    </section>
  );
}

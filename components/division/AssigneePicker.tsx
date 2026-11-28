"use client";

// 選負責人（可多選，每人可填負責的部分）。owner：A
// 沒有任何工作的組員要標出來（例如加上「尚無工作」標籤）。

import type { Assignee } from "@/lib/schemas/division";

export type AssigneePickerProps = {
  value: Assignee[];
  members: {
    id: string;
    displayName: string;
    color: string;
    hasTask: boolean;
  }[];
  onChange: (value: Assignee[]) => void;
};

export function AssigneePicker({ value, members, onChange }: AssigneePickerProps) {
  // 切換組員的選取狀態
  function toggleMember(memberId: string) {
    const isSelected = value.some((assignee) => assignee.memberId === memberId);

    if (isSelected) {
      // 已選擇：取消指派
      onChange(value.filter((assignee) => assignee.memberId !== memberId));
    } else {
      // 尚未選擇：新增負責人
      onChange([
        ...value,
        {
          memberId,
          part: null,
        },
      ]);
    }
  }

  // 更新組員負責的部分
  function updatePart(memberId: string, part: string) {
    onChange(
      value.map((assignee) =>
        assignee.memberId === memberId
          ? {
              ...assignee,
              part: part === "" ? null : part,
            }
          : assignee,
      ),
    );
  }

  return (
    <section aria-label="指派負責人" className="space-y-3">
      {/* 組員選擇清單 */}
      <div className="space-y-2">
        {members.map((member) => {
          const selectedAssignee = value.find((assignee) => assignee.memberId === member.id);

          const isSelected = selectedAssignee !== undefined;

          return (
            <div
              key={member.id}
              className={[
                "overflow-hidden rounded-xl border bg-surface",
                "transition-colors",
                isSelected ? "border-ink ring-1 ring-ink" : "border-line",
              ].join(" ")}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleMember(member.id)}
                className={[
                  "flex w-full items-center gap-3 p-3",
                  "text-left",
                  "transition-colors",
                  "hover:bg-surface-muted",
                  "focus-visible:outline-2",
                  "focus-visible:outline-brand",
                  "focus-visible:outline-offset-[-2px]",
                ].join(" ")}
              >
                {/* 組員頭像 */}
                <span
                  aria-hidden="true"
                  className={[
                    "flex size-9 shrink-0",
                    "items-center justify-center",
                    "rounded-full",
                    "text-sm font-semibold text-white",
                  ].join(" ")}
                  style={{
                    backgroundColor: member.color,
                  }}
                >
                  {Array.from(member.displayName)[0] ?? "?"}
                </span>

                {/* 組員資訊 */}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{member.displayName}</span>

                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {member.hasTask ? "已有分配工作" : "目前沒有工作"}
                  </span>
                </span>

                {/* 尚無工作標籤 */}
                {!member.hasTask && (
                  <span
                    className={[
                      "shrink-0 rounded-full",
                      "bg-warn-soft px-2 py-0.5",
                      "text-xs font-medium text-ink",
                    ].join(" ")}
                  >
                    尚無工作
                  </span>
                )}

                {/* 選取狀態 */}
                <span
                  aria-hidden="true"
                  className={[
                    "flex size-5 shrink-0",
                    "items-center justify-center",
                    "rounded border text-xs",
                    isSelected ? "border-ink bg-ink text-white" : "border-line bg-surface",
                  ].join(" ")}
                >
                  {isSelected ? "✓" : ""}
                </span>
              </button>

              {/* 多人負責時顯示負責部分 */}
              {isSelected && value.length > 1 && (
                <div className="space-y-1 px-3 pb-3">
                  <label
                    className="block text-xs text-ink-muted"
                    htmlFor={`assignee-part-${member.id}`}
                  >
                    {member.displayName} 負責的部分（選填）
                  </label>

                  <input
                    id={`assignee-part-${member.id}`}
                    type="text"
                    maxLength={40}
                    value={selectedAssignee.part ?? ""}
                    placeholder="例如：負責剪輯與字幕"
                    onChange={(event) => updatePart(member.id, event.target.value)}
                    className={[
                      "w-full rounded-lg",
                      "border border-line bg-surface",
                      "px-3 py-2 text-sm text-ink",
                      "placeholder:text-ink-muted",
                      "focus:border-brand",
                      "focus:outline-none",
                      "focus:ring-1 focus:ring-brand",
                    ].join(" ")}
                  />

                  <p className="text-right text-xs text-ink-muted">
                    {(selectedAssignee.part ?? "").length}/40
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 選取數量與操作說明 */}
      <div className="space-y-1">
        <p aria-live="polite" className="text-sm font-medium text-ink">
          已選擇 {value.length} 位負責人
        </p>

        <p className="text-xs leading-relaxed text-ink-muted">
          可選擇多位負責人，點擊已選擇的組員可取消指派。 多人負責時，可以填寫各自負責的部分。
        </p>
      </div>
    </section>
  );
}

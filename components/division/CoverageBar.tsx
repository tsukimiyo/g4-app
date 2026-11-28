// 「每位組員都有工作嗎」的一列頭貼。
// 沒有工作的組員顯示橘色提醒。owner：A

export type CoverageBarProps = {
  members: {
    id: string;
    displayName: string;
    color: string;
    hasTask: boolean;
  }[];
};

export function CoverageBar({ members }: CoverageBarProps) {
  // 計算已分配工作及尚未分配工作的人數
  const assignedCount = members.filter((member) => member.hasTask).length;

  const unassignedCount = members.length - assignedCount;

  const allAssigned = members.length > 0 && unassignedCount === 0;

  return (
    <section aria-label="組員工作覆蓋狀態" className="space-y-3">
      {/* 標題與工作覆蓋人數 */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm text-ink-muted">每個人都有工作嗎？</h3>

        <span className="text-xs tabular-nums text-ink-muted" aria-live="polite">
          {assignedCount}/{members.length} 人
        </span>
      </div>

      {/* 組員頭像清單 */}
      <ul className="flex flex-wrap justify-between gap-x-3 gap-y-4">
        {members.map((member) => (
          <li key={member.id} className="flex min-w-10 flex-1 flex-col items-center gap-1">
            {/* 組員頭像 */}
            <span
              aria-hidden="true"
              className={[
                "flex size-8 shrink-0",
                "items-center justify-center rounded-lg",
                "text-sm font-semibold",
                member.hasTask ? "text-white" : "border border-warn bg-warn-soft text-ink",
              ].join(" ")}
              style={
                member.hasTask
                  ? {
                      backgroundColor: member.color,
                    }
                  : undefined
              }
            >
              {Array.from(member.displayName)[0] ?? "?"}
            </span>

            {/* 組員姓名 */}
            <span
              className={[
                "break-all text-center text-xs",
                member.hasTask ? "text-ink" : "font-medium text-ink",
              ].join(" ")}
            >
              {member.displayName}
            </span>

            {/* 組員工作狀態 */}
            {member.hasTask ? (
              <span className="text-xs font-medium text-ok" aria-label="已有工作" title="已有工作">
                ✓
              </span>
            ) : (
              <span className="rounded bg-warn-soft px-1 py-0.5 text-center text-[10px] font-medium text-ink">
                尚無工作
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 整體工作覆蓋狀態 */}
      <p
        aria-live="polite"
        className={["text-xs leading-relaxed", allAssigned ? "text-ok" : "text-ink-muted"].join(
          " ",
        )}
      >
        {members.length === 0
          ? "目前沒有組員資料"
          : allAssigned
            ? "✓ 所有組員皆已分配到工作"
            : `尚有 ${unassignedCount} 位組員沒有分配到工作`}
      </p>
    </section>
  );
}

// owner：D
import { describe, expect, it } from "vitest";
import type { DraftTask } from "@/lib/schemas/division";
import { DraftWithWarnings } from "@/lib/schemas/division";
import { validateDivision } from "@/lib/rules/validate-division";
import draftMock from "@/mocks/division-draft.json";
import membersMock from "@/mocks/members.json";

const mock = DraftWithWarnings.parse(draftMock);
const members = membersMock.members.map(({ id }) => ({ id }));
const [m1, m2] = members.map((m) => m.id);
const finalDeadline = "2026-12-20";
const today = "2026-11-30";

let seq = 0;
const task = (over: Partial<DraftTask> = {}): DraftTask => ({
  key: `t${seq++}`,
  taskId: null,
  title: `任務 ${seq}`,
  assignees: [{ memberId: m1!, part: null }],
  deadline: "2026-12-10",
  deadlineText: null,
  evidence: [],
  confidence: null,
  reportEveryDays: null,
  reportTime: "21:00",
  ...over,
});

/** 只有一位組員 m1 的情況，避免 MEMBER_NO_TASK 干擾 */
const check = (tasks: DraftTask[], opts: { members?: { id: string }[]; today?: string } = {}) =>
  validateDivision({
    tasks,
    members: opts.members ?? [{ id: m1! }],
    finalDeadline,
    today: opts.today ?? today,
  });

describe("validateDivision", () => {
  it("mocks/division-draft.json → 正好是 mock 裡的 3 則警告（順序也相同）", () => {
    expect(validateDivision({ tasks: mock.draft.tasks, members, finalDeadline, today })).toEqual(
      mock.warnings,
    );
  });
  it("所有人都有工作、日期正常 → []", () => {
    const tasks = members.map((m) => task({ assignees: [{ memberId: m.id, part: null }] }));
    expect(validateDivision({ tasks, members, finalDeadline, today })).toEqual([]);
  });
  it("沒有任務 → 每位組員各一則 MEMBER_NO_TASK", () => {
    expect(validateDivision({ tasks: [], members, finalDeadline, today })).toEqual(
      members.map((m) => ({ code: "MEMBER_NO_TASK", memberId: m.id })),
    );
  });
  it("MEMBER_NO_TASK：多人負責的任務也算有工作", () => {
    const t = task({
      assignees: [
        { memberId: m1!, part: "畫面" },
        { memberId: m2!, part: "文字" },
      ],
    });
    expect(check([t], { members: [{ id: m1! }, { id: m2! }] })).toEqual([]);
    expect(check([task()], { members: [{ id: m1! }, { id: m2! }] })).toEqual([
      { code: "MEMBER_NO_TASK", memberId: m2 },
    ]);
  });
  it("TASK_NO_ASSIGNEE", () => {
    const t = task({ assignees: [] });
    expect(check([task(), t])).toEqual([{ code: "TASK_NO_ASSIGNEE", taskKey: t.key }]);
  });
  it("DEADLINE_MISSING", () => {
    const t = task({ deadline: null });
    expect(check([t])).toEqual([{ code: "DEADLINE_MISSING", taskKey: t.key }]);
  });
  it("DEADLINE_PAST：deadline < today；deadline = today 不算", () => {
    const past = task({ deadline: "2026-11-29" });
    expect(check([past])).toEqual([{ code: "DEADLINE_PAST", taskKey: past.key }]);
    expect(check([task({ deadline: today })])).toEqual([]);
  });
  it("DEADLINE_AFTER_FINAL：deadline > finalDeadline；等於不算", () => {
    const late = task({ deadline: "2026-12-21" });
    expect(check([late])).toEqual([{ code: "DEADLINE_AFTER_FINAL", taskKey: late.key }]);
    expect(check([task({ deadline: finalDeadline })])).toEqual([]);
  });
  it("跨年的日期也比得對", () => {
    const t = task({ deadline: "2027-01-02" });
    expect(check([t])).toEqual([{ code: "DEADLINE_AFTER_FINAL", taskKey: t.key }]);
  });
  it("DUPLICATE_TITLE：前後空白不同也算重複，每個重複的任務各一則", () => {
    const a = task({ title: "錄影片" });
    const b = task({ title: "  錄影片 " });
    const c = task({ title: "剪影片" });
    expect(check([a, b, c])).toEqual([
      { code: "DUPLICATE_TITLE", taskKey: a.key },
      { code: "DUPLICATE_TITLE", taskKey: b.key },
    ]);
  });
  it("同一個任務有多個問題 → 依固定順序全部列出", () => {
    const a = task({ title: "重複", assignees: [], deadline: "2026-11-01" });
    const b = task({ title: "重複", assignees: [{ memberId: m1!, part: null }] });
    expect(check([a, b])).toEqual([
      { code: "TASK_NO_ASSIGNEE", taskKey: a.key },
      { code: "DEADLINE_PAST", taskKey: a.key },
      { code: "DUPLICATE_TITLE", taskKey: a.key },
      { code: "DUPLICATE_TITLE", taskKey: b.key },
    ]);
  });
});

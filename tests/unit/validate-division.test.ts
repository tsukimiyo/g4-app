// owner：D
import { describe, it } from "vitest";

describe("validateDivision", () => {
  it.todo("mocks/division-draft.json → 正好是 mock 裡的 3 則警告");
  it.todo("所有人都有工作、日期正常 → []");
  it.todo("MEMBER_NO_TASK：多人負責的任務也算有工作");
  it.todo("TASK_NO_ASSIGNEE");
  it.todo("DEADLINE_MISSING");
  it.todo("DEADLINE_PAST：deadline < today；deadline = today 不算");
  it.todo("DEADLINE_AFTER_FINAL：deadline > finalDeadline；等於不算");
  it.todo("DUPLICATE_TITLE：前後空白不同也算重複，每個重複的任務各一則");
});

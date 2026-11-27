// owner：E
import { describe, it } from "vitest";

describe("toDraftTasks", () => {
  it.todo("移除不在名單的 owner");
  it.todo("移除不存在的 evidence 編號；全部移除後丟掉整個任務");
  it.todo("evidence 為空的任務直接丟掉");
  it.todo("deadline 不是 YYYY-MM-DD → null，保留 deadlineText");
  it.todo("補上 key（唯一）、taskId = null、reportEveryDays = null、reportTime = 21:00");
  it.todo("owners → assignees（欄位名稱轉換）");
});

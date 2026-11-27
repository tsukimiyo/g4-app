// 規格：docs/implementation-plan.md「Week 1 共用規格 → 2. 共用型別」
// ⚠️ 共用契約：修改前先在群組通知 A、C、D、E（見 CONTRIBUTING.md「共用檔案」）
import { z } from "zod";
import { hm, id, ymd } from "./common";

export const Assignee = z.object({
  memberId: id,
  part: z.string().max(40).nullable(), // 多人負責時各自負責的部分
});
export type Assignee = z.infer<typeof Assignee>;

export const DraftTask = z.object({
  key: z.string().min(1), // 前端暫時 id（nanoid）；同一份草稿內唯一
  taskId: id.nullable(), // 已生效的任務 id；新任務為 null。分工出新版本時用它對應回原本的 tasks 列
  title: z.string().min(1).max(40),
  assignees: z.array(Assignee), // 空陣列 = 未指派
  deadline: ymd.nullable(),
  deadlineText: z.string().nullable(), // 逐字稿原文，例如「下週五前」
  evidence: z.array(z.number().int().nonnegative()), // TranscriptMessage.idx；手動分配為 []
  confidence: z.enum(["high", "low"]).nullable(), // 手動新增的任務為 null
  reportEveryDays: z.number().int().min(1).max(14).nullable(), // null = 還沒設定
  reportTime: hm.default("21:00"),
});
export type DraftTask = z.infer<typeof DraftTask>;

export const DraftStatus = z.enum(["draft", "pending", "active", "superseded"]);
export type DraftStatus = z.infer<typeof DraftStatus>;

export const DivisionDraft = z.object({
  id,
  projectId: id,
  version: z.number().int().positive(),
  source: z.enum(["txt", "manual"]),
  importId: id.nullable(),
  status: DraftStatus,
  tasks: z.array(DraftTask),
  openQuestions: z.array(z.string()),
});
export type DivisionDraft = z.infer<typeof DivisionDraft>;

export const DivisionWarningCode = z.enum([
  "MEMBER_NO_TASK",
  "TASK_NO_ASSIGNEE",
  "DEADLINE_MISSING",
  "DEADLINE_PAST",
  "DEADLINE_AFTER_FINAL",
  "DUPLICATE_TITLE",
]);
export type DivisionWarningCode = z.infer<typeof DivisionWarningCode>;

export const DivisionWarning = z.object({
  code: DivisionWarningCode,
  memberId: id.optional(),
  taskKey: z.string().optional(),
});
export type DivisionWarning = z.infer<typeof DivisionWarning>;
// warnings 不存資料庫，由 validateDivision() 每次重算（lib/rules/validate-division.ts）

/** API 回傳草稿時一律附上當下的警告 */
export const DraftWithWarnings = z.object({
  draft: DivisionDraft,
  warnings: z.array(DivisionWarning),
});
export type DraftWithWarnings = z.infer<typeof DraftWithWarnings>;

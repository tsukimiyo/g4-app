// owner: C (W1). Helpers for draft routes; no changes to shared contracts.
import "server-only";
import { ApiError } from "@/lib/api/http";
import { requireMember } from "@/lib/api/auth";
import { validateDivision } from "@/lib/rules/validate-division";
import { DivisionDraft, DraftWithWarnings, type DraftTask } from "@/lib/schemas/division";
import { id } from "@/lib/schemas/common";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { todayInTaipei } from "@/lib/time";

type DraftRow = Database["public"]["Tables"]["division_drafts"]["Row"];
type Db = ReturnType<typeof createAdminClient>;

export function routeId(value: string) {
  return id.parse(value);
}

export function draftFromRow(row: DraftRow) {
  return DivisionDraft.parse({
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    source: row.source,
    importId: row.import_id,
    status: row.status,
    tasks: row.tasks,
    openQuestions: row.open_questions,
  });
}

export async function projectContext(db: Db, pid: string) {
  const project = await db
    .from("projects")
    .select("member_count,final_deadline")
    .eq("id", pid)
    .maybeSingle();
  if (project.error) throw project.error;
  if (!project.data) throw new ApiError(404, "PROJECT_NOT_FOUND", "找不到這個專題");
  const members = await db
    .from("members")
    .select("id")
    .eq("project_id", pid)
    .order("joined_at")
    .order("id");
  if (members.error) throw members.error;
  return {
    project: project.data as Pick<
      Database["public"]["Tables"]["projects"]["Row"],
      "member_count" | "final_deadline"
    >,
    members: (members.data ?? []) as { id: string }[],
  };
}

export async function loadDraft(db: Db, did: string) {
  const { data, error } = await db.from("division_drafts").select("*").eq("id", did).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "DRAFT_NOT_FOUND", "找不到這份草稿");
  const row = data as DraftRow;
  const { member } = await requireMember(row.project_id);
  if (row.status !== "draft")
    throw new ApiError(409, "DRAFT_LOCKED", "草稿已送出確認或已生效，不能編輯");
  return { row, member };
}

export function warningsFor(
  tasks: DraftTask[],
  context: Awaited<ReturnType<typeof projectContext>>,
) {
  return validateDivision({
    tasks,
    members: context.members,
    finalDeadline: context.project.final_deadline,
    today: todayInTaipei(),
  });
}

export function draftResponse(row: DraftRow, context: Awaited<ReturnType<typeof projectContext>>) {
  const draft = draftFromRow(row);
  return DraftWithWarnings.parse({ draft, warnings: warningsFor(draft.tasks, context) });
}

export function failRpc(error: { message: string }): never {
  switch (error.message) {
    case "PROJECT_NOT_FOUND":
      throw new ApiError(404, "PROJECT_NOT_FOUND", "找不到這個專題");
    case "DRAFT_NOT_FOUND":
      throw new ApiError(404, "DRAFT_NOT_FOUND", "找不到這份草稿");
    case "NOT_MEMBER":
      throw new ApiError(403, "NOT_MEMBER", "你不是這個專題的組員");
    case "DRAFT_LOCKED":
      throw new ApiError(409, "DRAFT_LOCKED", "草稿已送出確認或已生效，不能編輯");
    case "DRAFT_OUTDATED":
      throw new ApiError(409, "DRAFT_OUTDATED", "已有更新版本的分工生效，請重新建立草稿");
    case "DRAFT_CHANGED":
      throw new ApiError(409, "DRAFT_CHANGED", "草稿或專題資料已變更，請重新整理後再試");
    case "MEMBERS_NOT_JOINED":
      throw new ApiError(409, "MEMBERS_NOT_JOINED", "組員尚未全部加入");
    default:
      throw error;
  }
}

// Structural integrity beyond the UI's six warnings. Incomplete assignments are allowed.
export async function checkTaskIntegrity(
  db: Db,
  row: DraftRow,
  tasks: DraftTask[],
  members: { id: string }[],
) {
  const memberIds = new Set(members.map((m) => m.id));
  const keys = new Set<string>();
  const existingIds = new Set<string>();
  const invalid = (message: string): never => {
    throw new ApiError(400, "VALIDATION_FAILED", message);
  };
  for (const task of tasks) {
    if (keys.has(task.key)) invalid("草稿內任務 key 不可重複");
    keys.add(task.key);
    if (!task.title.trim()) invalid("任務名稱不可只有空白");
    const assigned = new Set<string>();
    for (const assignee of task.assignees) {
      if (!memberIds.has(assignee.memberId)) invalid("任務負責人必須是本專題組員");
      if (assigned.has(assignee.memberId)) invalid("同一任務不可重複指派同一組員");
      assigned.add(assignee.memberId);
    }
    if (task.deadline !== null) {
      const date = new Date(`${task.deadline}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== task.deadline)
        invalid("任務截止日期不存在");
    }
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.reportTime)) invalid("回報時間不正確");
    if (task.taskId !== null) {
      if (existingIds.has(task.taskId)) invalid("同一正式任務不可重複出現");
      existingIds.add(task.taskId);
    }
  }
  if (existingIds.size) {
    const { data, error } = await db
      .from("tasks")
      .select("id")
      .eq("project_id", row.project_id)
      .in("id", [...existingIds]);
    if (error) throw error;
    if (data?.length !== existingIds.size) invalid("正式任務不存在或不屬於本專題");
  }
  const evidence = [...new Set(tasks.flatMap((task) => task.evidence))];
  if (evidence.length) {
    const importId = row.import_id;
    if (!importId) return invalid("手動分配草稿不可帶有逐字稿依據");
    // Fetch in bounded batches, so long lists do not exceed request URL limits.
    for (let offset = 0; offset < evidence.length; offset += 100) {
      const batch = evidence.slice(offset, offset + 100);
      const { data, error } = await db
        .from("transcript_messages")
        .select("idx")
        .eq("import_id", importId)
        .in("idx", batch);
      if (error) throw error;
      if (data?.length !== batch.length) invalid("任務依據不屬於這份逐字稿");
    }
  }
}

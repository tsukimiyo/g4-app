// POST /api/projects — 建立專題
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { requireUser } from "@/lib/api/auth";
import { ApiError, handle, json, parseBody } from "@/lib/api/http";
import { CreateProjectInput } from "@/lib/schemas/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { toHm } from "@/lib/time";

export const POST = handle(async (req: Request) => {
  // 1. 驗證登入身分
  const user = await requireUser();

  // 2. 驗證輸入資料
  const input = await parseBody(req, CreateProjectInput);

  if ([input.course, input.teamName, input.title, input.displayName].some((value) => !value.trim())) {
    throw new ApiError(400, "VALIDATION_FAILED", "課程、組別、專題與顯示名稱不可只有空白");
  }

  // 3. 確認截止日是真實存在的日期
  const deadline = new Date(`${input.finalDeadline}T00:00:00Z`);

  if (
    Number.isNaN(deadline.getTime()) ||
    deadline.toISOString().slice(0, 10) !== input.finalDeadline
  ) {
    throw new ApiError(400, "VALIDATION_FAILED", "專題截止日期不正確");
  }

  // 4. 建立伺服器端管理者 Client
  const db = createAdminClient();

  // 5. 呼叫 RPC，在同一個 Transaction 內
  // 建立專題與第一位組員
  const { data, error } = await db.rpc("create_project_with_member", {
    p_user_id: user.id,
    p_course: input.course,
    p_team_name: input.teamName,
    p_title: input.title,
    p_member_count: input.memberCount,
    p_final_deadline: input.finalDeadline,
    p_ta_emails: input.taEmails,
    p_display_name: input.displayName,
  });

  if (error) throw error;

  if (!data) {
    throw new ApiError(500, "INTERNAL", "建立專題失敗");
  }

  // 6. 取得 RPC 回傳的資料
  const { project, member } = data as {
    project: Database["public"]["Tables"]["projects"]["Row"];
    member: Database["public"]["Tables"]["members"]["Row"];
  };

  // 7. 依照團隊規範轉成 camelCase
  return json(
    {
      project: {
        id: project.id,
        course: project.course,
        teamName: project.team_name,
        title: project.title,
        memberCount: project.member_count,
        finalDeadline: project.final_deadline,
        taEmails: project.ta_emails,
        weeklyReportDow: project.weekly_report_dow,
        weeklyReportTime: toHm(project.weekly_report_time),
        countdownHours: project.countdown_hours,
        createdBy: project.created_by,
        createdAt: project.created_at,
      },
      member: {
        id: member.id,
        projectId: member.project_id,
        userId: member.user_id,
        displayName: member.display_name,
        color: member.color,
        joinedAt: member.joined_at,
      },
    },
    201,
  );
});

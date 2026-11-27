// API 的權限檢查。每個 Route Handler 第一行就要呼叫其中一個。
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "./http";

/** 必須登入；回傳 Supabase auth user */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "請先登入");
  return user;
}

export type CurrentMember = {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string;
};

/** 必須是該專題的組員；回傳 user 與 member 列 */
export async function requireMember(projectId: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("members")
    .select("id, project_id, user_id, display_name")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(403, "NOT_MEMBER", "你不是這個專題的組員");
  return { user, member: data as CurrentMember };
}

// 伺服器端專用、使用 secret key 的 client：會「繞過 RLS」。
// 只能在 app/api/** 與 lib/** 的伺服器端程式使用，而且呼叫前一定要先用 requireMember() 檢查權限。
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

export function createAdminClient() {
  return createClient(publicEnv.supabaseUrl(), serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

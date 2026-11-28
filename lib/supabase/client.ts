// 瀏覽器端（Client Component）用的 Supabase client：只用來「讀」資料與訂閱 Realtime，受 RLS 保護。
// 寫入一律呼叫 /api/*（見 docs/conventions.md「讀寫原則」）。
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export function createClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey());
}

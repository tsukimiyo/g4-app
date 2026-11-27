// 瀏覽器端（Client Component）用的 Supabase client：只用來「讀」資料與訂閱 Realtime，受 RLS 保護。
// 寫入一律呼叫 /api/*（見 docs/conventions.md「讀寫原則」）。
// TODO(C)：跑完 pnpm db:types 後改成 createBrowserClient<Database>(...) 取得型別。
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey());
}

// Server Component / Route Handler 用的 Supabase client：帶著使用者的登入 cookie，受 RLS 保護。
// 用來確認「現在是誰」與讀取資料；需要繞過 RLS 的寫入改用 ./admin.ts。
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 在 Server Component 裡無法寫 cookie；proxy.ts 會負責刷新 session，這裡可以忽略
        }
      },
    },
  });
}

// 每個請求都刷新 Supabase 登入 session（由根目錄的 proxy.ts 呼叫）。
// 未登入時要不要導去 /login 由 B 決定，寫在下面的 TODO。
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // 還沒設定 .env.local 時讓畫面照常顯示（方便只做 UI 的組員），不要整站壞掉
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // 不要在 createServerClient 和 getUser 之間加其他程式，否則 session 可能不會刷新
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO(B)：未登入的人進入 /p/** 時導向 /login?next=<原網址>
  void user;

  return response;
}

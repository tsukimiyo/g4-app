// Next.js 16 的 proxy（以前叫 middleware）。只負責刷新登入 session。
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 排除靜態檔、圖片與 cron 入口
    "/((?!_next/static|_next/image|favicon.ico|samples/|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

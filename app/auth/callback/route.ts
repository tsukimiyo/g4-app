// GET /auth/callback — Supabase OAuth（Google）與 magic link 登入後導回這裡，換成 session cookie。
// owner：B（W1）
// Supabase Dashboard → Authentication → URL Configuration 要加上
//   http://localhost:3000/auth/callback 與 https://<vercel 網域>/auth/callback（預覽網址可用 https://*-<team>.vercel.app/**）
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  // 只允許站內路徑，避免 open redirect
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}

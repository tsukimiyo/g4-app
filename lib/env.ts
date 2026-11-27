// 環境變數。NEXT_PUBLIC_* 必須寫成完整的 process.env.NEXT_PUBLIC_XXX，Next.js 才會在 build 時替換。
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`缺少環境變數 ${name}：請照 .env.example 建立 .env.local（見 docs/setup.md）`);
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** 只能在伺服器端呼叫 */
export const serverEnv = {
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
  llmUseCache: () => process.env.LLM_USE_CACHE === "1",
};

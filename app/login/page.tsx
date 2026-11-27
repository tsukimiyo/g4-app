import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W1）
export default function Page() {
  return (
    <PagePlaceholder
      title="登入"
      owner="B"
      week="W1"
      description="Google 登入、Email magic link（Supabase Auth）。登入後導回 ?next= 的網址。"
    />
  );
}

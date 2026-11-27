import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W3）
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="助教查看頁"
      owner="B"
      week="W3"
      description="只讀；實績徽章與各組員連結。資料經 API 用 token 驗證後讀取（不能靠 RLS）。"
      params={p}
    />
  );
}

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W1）
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="加入專題"
      owner="B"
      week="W1"
      description="點邀請連結進來：未登入先登入 → 填顯示名稱 → POST /api/join/[code] → 導到 /p/[pid]。"
      params={p}
    />
  );
}

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="全組確認"
      owner="A"
      week="W1"
      description="確認自己那項或「提出修改」（附說明）→ POST /api/drafts/[did]/confirm。顯示「已確認 3/5」。"
      params={p}
    />
  );
}

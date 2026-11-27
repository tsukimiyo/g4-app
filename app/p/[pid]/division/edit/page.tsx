import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="分工調整"
      owner="A"
      week="W1"
      description="DivisionEditor：橘色警告、未指派選人、改截止日、新增任務、多人負責。自動儲存 PATCH /api/drafts/[did]。沒有警告才能送出 POST /api/drafts/[did]/submit。"
      params={p}
    />
  );
}

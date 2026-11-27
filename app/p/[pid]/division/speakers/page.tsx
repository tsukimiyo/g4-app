import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="發言者對應"
      owner="A"
      week="W1"
      description="顯示 ImportResult.speakers 的建議配對，讓上傳者確認／修改、標記非組員、補討論日期 → PUT /api/imports/[iid]/speakers → POST /api/imports/[iid]/extract。"
      params={p}
    />
  );
}

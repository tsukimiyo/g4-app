import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W3）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="期末摘要"
      owner="A"
      week="W3"
      description="貢獻摘要草稿、提出調整、交出（匯出 PDF 或寄連結給助教）。"
      params={p}
    />
  );
}

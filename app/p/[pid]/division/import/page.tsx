import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="選擇分工來源"
      owner="A"
      week="W1"
      description="路線 A：上傳 .txt（≤ 2 MB，附格式說明與範例檔 /samples/transcript-example.txt）→ POST /api/projects/[pid]/imports。路線 B：手動分配 → POST /api/projects/[pid]/drafts。"
      params={p}
    />
  );
}

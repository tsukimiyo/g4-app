import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="回報頻率"
      owner="A"
      week="W1"
      description="每個任務顯示 suggestFrequency() 的建議與三個預設選項 → PUT /api/tasks/[tid]/frequency。"
      params={p}
    />
  );
}

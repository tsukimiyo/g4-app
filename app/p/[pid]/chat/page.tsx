import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W2）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="群組聊天室"
      owner="B"
      week="W2"
      description="只做「能傳、能收、卡片能按」。"
      params={p}
    />
  );
}

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W2）
export default async function Page({ params }: { params: Promise<{ pid: string; eid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="事件"
      owner="B"
      week="W2"
      description="求助與需要協調事件：橘／紅、倒數、我來協調、方案卡、討論串。"
      params={p}
    />
  );
}

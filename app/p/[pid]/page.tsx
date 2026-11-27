import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="首頁"
      owner="B"
      week="W1"
      description="Week 1：生效後的分工表（DivisionTable）。12/2 起加上全組進度列（ProgressRow）。"
      params={p}
    />
  );
}

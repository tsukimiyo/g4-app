import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W3）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="貢獻一覽"
      owner="B"
      week="W3"
      description="由 contributions 彙整（負責、幫忙、協調），不顯示比例或分數。"
      params={p}
    />
  );
}

import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W2）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="回報"
      owner="A"
      week="W2"
      description="例行回報（七階段進度＋一句近況）、自由回報、重新回報。"
      params={p}
    />
  );
}

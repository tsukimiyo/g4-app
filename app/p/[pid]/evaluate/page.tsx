import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：A（W3）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="自評與組員評語"
      owner="A"
      week="W3"
      description="只有助教看得到，不進 PDF。"
      params={p}
    />
  );
}

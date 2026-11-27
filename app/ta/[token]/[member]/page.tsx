import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W3）
export default async function Page({
  params,
}: {
  params: Promise<{ token: string; member: string }>;
}) {
  const p = await params;
  return (
    <PagePlaceholder
      title="助教查看：組員詳細紀錄"
      owner="B"
      week="W3"
      description="只讀；單一組員的詳細紀錄與評語。"
      params={p}
    />
  );
}

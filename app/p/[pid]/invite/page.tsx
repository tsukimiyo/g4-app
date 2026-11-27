import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W1）
export default async function Page({ params }: { params: Promise<{ pid: string }> }) {
  const p = await params;
  return (
    <PagePlaceholder
      title="邀請組員"
      owner="B"
      week="W1"
      description="邀請連結與複製按鈕；QR code 在 12/2–12/6 加上（qrcode 套件，前端產生）。"
      params={p}
    />
  );
}

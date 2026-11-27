import { PagePlaceholder } from "@/components/ui/PagePlaceholder";

// owner：B（W1）
export default function Page() {
  return (
    <PagePlaceholder
      title="建立專題"
      owner="B"
      week="W1"
      description="課程、組名、專題名稱、人數、最終截止日、助教信箱（可多個）→ POST /api/projects。"
    />
  );
}

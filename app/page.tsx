import Link from "next/link";

// owner：B。之後改成：已登入 → 導向自己的專題；未登入 → 導向 /login
export default function Home() {
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">第 4 組專題協作</h1>
      <p className="text-ink-muted">開發中。Week 1 Core 的頁面：</p>
      <ul className="list-disc space-y-1 pl-6 text-brand underline">
        <li>
          <Link href="/login">登入</Link>
        </li>
        <li>
          <Link href="/p/new">建立專題</Link>
        </li>
        <li>
          <Link href="/p/demo/division/import">分工：選擇來源（demo）</Link>
        </li>
        <li>
          <Link href="/p/demo/division/edit">分工：調整（demo）</Link>
        </li>
      </ul>
    </main>
  );
}

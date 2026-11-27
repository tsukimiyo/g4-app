// 還沒實作的頁面先顯示這個。實作時把整個 <PagePlaceholder /> 換掉即可。
type Props = {
  title: string;
  owner: string;
  week: string;
  description: string;
  params?: Record<string, string>;
};

export function PagePlaceholder({ title, owner, week, description, params }: Props) {
  return (
    <main className="space-y-4 p-6">
      <p className="text-xs text-ink-muted">
        {week}｜owner：{owner}
      </p>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm leading-relaxed">{description}</p>
      {params && (
        <pre className="rounded bg-surface-muted p-3 text-xs">
          {JSON.stringify(params, null, 2)}
        </pre>
      )}
    </main>
  );
}

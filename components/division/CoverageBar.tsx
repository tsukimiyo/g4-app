// 「每位組員都有工作嗎」的一列頭貼，沒工作的人顯示橘色。owner：A
export type CoverageBarProps = {
  members: { id: string; displayName: string; color: string; hasTask: boolean }[];
};

export function CoverageBar(_props: CoverageBarProps) {
  // TODO(A)
  return null;
}

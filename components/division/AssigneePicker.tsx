"use client";
// 選負責人（可多選，每人可填負責的部分）。owner：A
// 沒有任何工作的組員要標出來（例如加上「尚無工作」標籤）。
import type { Assignee } from "@/lib/schemas/division";

export type AssigneePickerProps = {
  value: Assignee[];
  members: { id: string; displayName: string; color: string; hasTask: boolean }[];
  onChange: (value: Assignee[]) => void;
};

export function AssigneePicker(_props: AssigneePickerProps) {
  // TODO(A)
  return null;
}

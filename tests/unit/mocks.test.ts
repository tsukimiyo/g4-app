// 確保 mocks/ 與 lib/schemas/ 一致：schema 改了而 mock 沒改，這裡會失敗。
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { DraftWithWarnings } from "@/lib/schemas/division";
import { id, ymd } from "@/lib/schemas/common";
import draft from "@/mocks/division-draft.json";
import members from "@/mocks/members.json";

describe("mocks", () => {
  it("division-draft.json 符合 DraftWithWarnings", () => {
    expect(() => DraftWithWarnings.parse(draft)).not.toThrow();
  });

  it("members.json 格式正確", () => {
    const Members = z.object({
      projectId: id,
      finalDeadline: ymd,
      members: z.array(z.object({ id, displayName: z.string(), color: z.string() })),
    });
    expect(() => Members.parse(members)).not.toThrow();
  });

  it("草稿裡的 memberId 都在組員名單中", () => {
    const ids = new Set(members.members.map((m) => m.id));
    for (const task of draft.draft.tasks) {
      for (const a of task.assignees) expect(ids.has(a.memberId)).toBe(true);
    }
  });
});

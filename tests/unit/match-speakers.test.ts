// owner：D
import { describe, it } from "vitest";

describe("matchSpeakers", () => {
  it.todo("speaker_aliases 優先");
  it.todo("完全相同");
  it.todo("包含：品妤 ↔ 林品妤");
  it.todo("編輯距離 ≤ 1");
  it.todo("配不到 → null、matchedBy = none");
  it.todo("兩個名字都自動配到同一位組員 → 兩個都回 null");
});

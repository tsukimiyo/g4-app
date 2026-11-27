// 發言者對應：逐字稿裡的名字 → 組員。owner：D
// 純函式。測試：tests/unit/match-speakers.test.ts

export type SpeakerSuggestion = {
  speakerRaw: string;
  suggestedMemberId: string | null;
  matchedBy: "alias" | "exact" | "contains" | "edit_distance" | "none";
};

/**
 * 配對順序：
 * 1. speaker_aliases 已存過的對應（aliases 參數）
 * 2. 完全相同
 * 3. 包含（「品妤」↔「林品妤」）
 * 4. 編輯距離 ≤ 1
 * 5. 都配不到 → null（由上傳者在發言者對應頁手動選，或標為非組員）
 * 同一位組員不要被兩個名字同時「自動」配對；有衝突時兩個都回 null 讓人決定。
 */
export function matchSpeakers(
  _speakers: string[],
  _members: { id: string; displayName: string }[],
  _aliases: Map<string, string | null>,
): SpeakerSuggestion[] {
  // TODO(D)
  throw new Error("matchSpeakers 尚未實作");
}

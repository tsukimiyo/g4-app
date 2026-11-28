// 發言者對應：逐字稿裡的名字 → 組員。owner：D
// 純函式。測試：tests/unit/match-speakers.test.ts

export type SpeakerSuggestion = {
  speakerRaw: string;
  suggestedMemberId: string | null;
  matchedBy: "alias" | "exact" | "contains" | "edit_distance" | "none";
};

type Member = { id: string; displayName: string };
type AutoMatch = { memberId: string; matchedBy: "exact" | "contains" | "edit_distance" };

/** 「包含」與「編輯距離」要求較短的名字至少幾個字，避免「妤」配到所有名字裡有妤的人 */
const MIN_FUZZY_LENGTH = 2;

/**
 * 配對順序：
 * 1. speaker_aliases 已存過的對應（aliases 參數）。對應到 null = 已標為非組員；
 *    對應的組員已不在名單（退出）→ 當作沒存過，往下配
 * 2. 完全相同
 * 3. 包含（「品妤」↔「林品妤」）
 * 4. 編輯距離 ≤ 1（「品妤」↔「品瑜」）
 * 5. 都配不到 → null（由上傳者在發言者對應頁手動選，或標為非組員）
 * - 比對前先正規化：NFKC（全形英數轉半形）、轉小寫、去掉所有空白
 * - 同一步驟有多位組員符合（例如「小王」同時包含在兩人名字裡）→ 不猜，回 null
 * - 同一位組員不要被兩個名字同時「自動」配對；有衝突時兩個都回 null 讓人決定。
 *   aliases 是人確認過的對應，不算自動，也不參與衝突判斷
 * - 回傳順序與 speakers 相同
 */
export function matchSpeakers(
  speakers: string[],
  members: Member[],
  aliases: Map<string, string | null>,
): SpeakerSuggestion[] {
  const memberIds = new Set(members.map((m) => m.id));
  const normalizedMembers = members.map((m) => ({ id: m.id, name: normalize(m.displayName) }));

  const results = speakers.map((speakerRaw): SpeakerSuggestion & { auto: boolean } => {
    if (aliases.has(speakerRaw)) {
      const memberId = aliases.get(speakerRaw) ?? null;
      if (memberId === null || memberIds.has(memberId)) {
        return { speakerRaw, suggestedMemberId: memberId, matchedBy: "alias", auto: false };
      }
    }
    const auto = autoMatch(normalize(speakerRaw), normalizedMembers);
    return auto
      ? { speakerRaw, suggestedMemberId: auto.memberId, matchedBy: auto.matchedBy, auto: true }
      : { speakerRaw, suggestedMemberId: null, matchedBy: "none", auto: false };
  });

  // 同一位組員被兩個以上「不同的」名字自動配到 → 都改回 null
  const namesByMember = new Map<string, Set<string>>();
  for (const r of results) {
    if (!r.auto || !r.suggestedMemberId) continue;
    const names = namesByMember.get(r.suggestedMemberId) ?? new Set<string>();
    names.add(r.speakerRaw);
    namesByMember.set(r.suggestedMemberId, names);
  }

  return results.map(({ auto, ...r }) =>
    auto && namesByMember.get(r.suggestedMemberId!)!.size > 1
      ? { speakerRaw: r.speakerRaw, suggestedMemberId: null, matchedBy: "none" }
      : r,
  );
}

function autoMatch(speaker: string, members: { id: string; name: string }[]): AutoMatch | null {
  if (speaker === "") return null;

  const steps: [AutoMatch["matchedBy"], (name: string) => boolean][] = [
    ["exact", (name) => name === speaker],
    [
      "contains",
      (name) =>
        Math.min(charLength(name), charLength(speaker)) >= MIN_FUZZY_LENGTH &&
        (name.includes(speaker) || speaker.includes(name)),
    ],
    [
      "edit_distance",
      (name) =>
        Math.min(charLength(name), charLength(speaker)) >= MIN_FUZZY_LENGTH &&
        editDistanceAtMostOne(name, speaker),
    ],
  ];

  for (const [matchedBy, test] of steps) {
    const hits = members.filter((m) => test(m.name));
    if (hits.length === 1) return { memberId: hits[0]!.id, matchedBy };
    if (hits.length > 1) return null; // 有歧義就不猜
  }
  return null;
}

/** NFKC（全形英數轉半形）、小寫、去掉所有空白 */
function normalize(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function charLength(s: string): number {
  return Array.from(s).length;
}

/** 兩個字串的編輯距離（Levenshtein）是否 ≤ 1；以 code point 計算，避免 emoji 被算成兩個字 */
function editDistanceAtMostOne(a: string, b: string): boolean {
  const x = Array.from(a);
  const y = Array.from(b);
  if (Math.abs(x.length - y.length) > 1) return false;

  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  if (x.length === y.length) return x.slice(i + 1).join("") === y.slice(i + 1).join(""); // 替換一個字
  const [longer, shorter] = x.length > y.length ? [x, y] : [y, x];
  return longer.slice(i + 1).join("") === shorter.slice(i).join(""); // 多／少一個字
}

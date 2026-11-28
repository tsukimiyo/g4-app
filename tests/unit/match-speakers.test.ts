// owner：D
import { describe, expect, it } from "vitest";
import { matchSpeakers } from "@/lib/transcript/match-speakers";
import mock from "@/mocks/members.json";

const members = mock.members.map(({ id, displayName }) => ({ id, displayName }));
const idOf = (name: string) => members.find((m) => m.displayName === name)!.id;
const noAliases = new Map<string, string | null>();

/** 只看一個名字的結果 */
const one = (speaker: string, list = members, aliases = noAliases) =>
  matchSpeakers([speaker], list, aliases)[0]!;

describe("matchSpeakers", () => {
  it("speaker_aliases 優先", () => {
    // 「品妤」本來會完全相同配到品妤，但 alias 存的是柏翰 → 用 alias
    const aliases = new Map([["品妤", idOf("柏翰")]]);
    expect(one("品妤", members, aliases)).toEqual({
      speakerRaw: "品妤",
      suggestedMemberId: idOf("柏翰"),
      matchedBy: "alias",
    });
  });
  it("alias 對應到 null → 已標為非組員，不再自動配對", () => {
    const aliases = new Map<string, string | null>([["品妤", null]]);
    expect(one("品妤", members, aliases)).toMatchObject({
      suggestedMemberId: null,
      matchedBy: "alias",
    });
  });
  it("alias 對應的組員已不在名單 → 當作沒存過，往下配", () => {
    const aliases = new Map([["品妤", "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"]]);
    expect(one("品妤", members, aliases)).toMatchObject({
      suggestedMemberId: idOf("品妤"),
      matchedBy: "exact",
    });
  });
  it("完全相同", () => {
    expect(one("詩涵")).toEqual({
      speakerRaw: "詩涵",
      suggestedMemberId: idOf("詩涵"),
      matchedBy: "exact",
    });
  });
  it("完全相同：忽略大小寫、空白與全形英數", () => {
    const list = [{ id: idOf("品妤"), displayName: "Amy Chen" }];
    expect(one("amychen", list).matchedBy).toBe("exact");
    expect(one("ＡＭＹ ＣＨＥＮ", list).matchedBy).toBe("exact");
  });
  it("包含：品妤 ↔ 林品妤（兩個方向都算）", () => {
    const list = [{ id: idOf("品妤"), displayName: "林品妤" }];
    expect(one("品妤", list)).toMatchObject({
      suggestedMemberId: idOf("品妤"),
      matchedBy: "contains",
    });
    expect(one("林品妤（組長）", members)).toMatchObject({
      suggestedMemberId: idOf("品妤"),
      matchedBy: "contains",
    });
  });
  it("包含：只有一個字不算（「妤」不配給品妤）", () => {
    expect(one("妤")).toMatchObject({ suggestedMemberId: null, matchedBy: "none" });
  });
  it("編輯距離 ≤ 1", () => {
    expect(one("品瑜")).toMatchObject({
      suggestedMemberId: idOf("品妤"),
      matchedBy: "edit_distance",
    });
    expect(one("柏翰翰")).toMatchObject({ matchedBy: "contains" }); // 包含先於編輯距離
    expect(one("育成")).toMatchObject({
      suggestedMemberId: idOf("育誠"),
      matchedBy: "edit_distance",
    });
  });
  it("編輯距離 2 以上不算", () => {
    expect(one("佩瑜").matchedBy).toBe("none");
  });
  it("配不到 → null、matchedBy = none", () => {
    expect(one("教授")).toEqual({ speakerRaw: "教授", suggestedMemberId: null, matchedBy: "none" });
  });
  it("同一步驟有兩位組員符合 → 不猜", () => {
    const list = [
      { id: idOf("品妤"), displayName: "王小明" },
      { id: idOf("柏翰"), displayName: "王小美" },
    ];
    expect(one("王小", list)).toMatchObject({ suggestedMemberId: null, matchedBy: "none" });
  });
  it("兩個名字都自動配到同一位組員 → 兩個都回 null", () => {
    const r = matchSpeakers(["品妤", "品瑜", "柏翰"], members, noAliases);
    expect(r).toEqual([
      { speakerRaw: "品妤", suggestedMemberId: null, matchedBy: "none" },
      { speakerRaw: "品瑜", suggestedMemberId: null, matchedBy: "none" },
      { speakerRaw: "柏翰", suggestedMemberId: idOf("柏翰"), matchedBy: "exact" },
    ]);
  });
  it("alias 不參與衝突判斷：alias 配到品妤，另一個名字也能自動配到品妤", () => {
    const aliases = new Map([["Amy", idOf("品妤")]]);
    const r = matchSpeakers(["Amy", "品妤"], members, aliases);
    expect(r.map((x) => x.suggestedMemberId)).toEqual([idOf("品妤"), idOf("品妤")]);
  });
  it("回傳順序與輸入相同；空名單時全部 none", () => {
    const speakers = ["冠廷", "教授", "育誠"];
    expect(matchSpeakers(speakers, members, noAliases).map((r) => r.speakerRaw)).toEqual(speakers);
    expect(matchSpeakers(speakers, [], noAliases).every((r) => r.matchedBy === "none")).toBe(true);
  });
});

// 逐字稿 .txt parser。owner：D
// 規格：docs/implementation-plan.md「Week 1 共用規格 → 1. 逐字稿 .txt 格式」
// 純函式，不碰資料庫、不用 AI。測試：tests/unit/parse-txt.test.ts
import type { ParsedTranscript, TranscriptParseError } from "@/lib/schemas/transcript";

/** 第一行的標題列：# 2026-11-16 第 4 組期末專題分工 */
export const HEADER_LINE = /^#\s*(\d{4}-\d{2}-\d{2})?\s*(.*)$/;

/**
 * 一句發言：[HH:MM] 名字：內容
 * - 時間可省略，時間與名字之間的空白可有可無
 * - 冒號全形「：」或半形「:」都可以
 * - 名字 1–20 字，不能以空白或冒號開頭
 * - (?!\/\/) 避免把跨行的網址（https://...）誤判成發言者「https」
 */
export const MESSAGE_LINE =
  /^(?:(\d{1,2}:\d{2})\s*)?([^\s:：][^:：]{0,19}?)\s*[:：](?!\/\/)\s*(.+)$/;

export type ParseResult =
  { ok: true; transcript: ParsedTranscript } | { ok: false; error: TranscriptParseError };

/**
 * 規則：
 * - 第一行符合 HEADER_LINE → 取出 meetingDate 與 title（日期可省略）
 * - 符合 MESSAGE_LINE → 新的一句；時間補零成 HH:MM（"9:05" → "09:05"）
 * - 不符合 → 接到上一句後面（以換行連接）；空行略過
 * - 第一句之前就出現不符合的行 → { ok: false, reason: "NO_MESSAGE_BEFORE_LINE", line }
 * - 整份沒有任何一句 → { ok: false, reason: "NO_MESSAGES" }
 * - 處理 \r\n、開頭的 BOM（﻿）
 * - memberId 一律先填 null，由 match-speakers 之後補上
 */
export function parseTxt(_text: string): ParseResult {
  // TODO(D)
  throw new Error("parseTxt 尚未實作");
}

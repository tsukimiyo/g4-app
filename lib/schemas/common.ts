// 共用的基本型別。前端表單、API 輸入、LLM 輸出都從這裡 import，不要各自重寫 regex。
import { z } from "zod";

/** "2026-11-16" */
export const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式應為 YYYY-MM-DD");

/** "13:05"（一律兩位數；Postgres time 欄位讀出的 "21:00:00" 要先經過 lib/time.ts 的 toHm()） */
export const hm = z.string().regex(/^\d{2}:\d{2}$/, "時間格式應為 HH:MM");

/**
 * 資料庫 id。zod v4 的 z.uuid() 會檢查版本位元，
 * mock 資料請用 crypto.randomUUID() 產生，不要用 0000...0001 這種假 id。
 */
export const id = z.uuid();

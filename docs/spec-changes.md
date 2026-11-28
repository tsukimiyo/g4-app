# 規格修正紀錄

`implementation-plan.md` 標示「已定案」的規格，在開 repo 前（11/27，#1–#20）與開工後（#21 起）做了以下修正。都已同步更新 `implementation-plan.md`，程式碼也照修正後的版本寫。

**之後要改規格**：先開 issue（標籤 `spec`）或在群組提出，通知受影響的人，再做一個**只改規格的 commit**（`contract(...)`：改 `lib/schemas/`、`mocks/`、migration 或這份文件）並馬上 push，各線 pull 後再跟進（步驟見 `CONTRIBUTING.md` 3-2）。每次修改都在下表加一列。

| # | 日期 | 修正 | 原因 | 影響的檔案 | 影響的人 |
| --- | --- | --- | --- | --- | --- |
| 1 | 11/27 | `transcript_imports.meeting_date` 改成可為 null；`PUT /speakers` 補日期，`/extract` 前檢查一定要有日期 | 上傳時就要寫入這筆資料，但第一行沒寫日期的檔案要到下一步才補得上，原本的 `not null` 會讓上傳直接失敗 | migration、`lib/schemas/api.ts` | C、D |
| 2 | 11/27 | parser 把時間補零（`9:05` → `09:05`）；新增 `lib/time.ts` 的 `toHm()`，把 DB `time` 欄位讀出的 `21:00:00` 轉成 `21:00` | regex 接受 1 位數小時，但 zod 的 `hm` 要求 2 位數；Postgres `time` 讀出來帶秒數 | `lib/transcript/parse-txt.ts`、`lib/time.ts` | C、D |
| 3 | 11/27 | regex 改為 `^(?:(\d{1,2}:\d{2})\s*)?([^\s:：][^:：]{0,19}?)\s*[:：](?!\/\/)\s*(.+)$` | 原本的寫法會把跨行的網址當成發言者「https」；時間與名字之間沒空白、名字後面有空白時會解析錯 | `lib/transcript/parse-txt.ts`（已附測試） | D |
| 4 | 11/27 | 用 zod v4；id 用 `z.uuid()`；LLM schema 改用 SDK 內建的 `betaZodOutputFormat()`，不用 `zod-to-json-schema` | `zod-to-json-schema` 不支援 zod v4；v4 的 uuid 檢查較嚴格，mock 不能用 `0000…0001` 這種假 id | `lib/schemas/`、`mocks/` | A、E |
| 5 | 11/27 | LLM 改用 **structured outputs**（`output_config.format`）強制 JSON，不用 tool use；模型指定為 `claude-sonnet-5-5`、`claude-haiku-5-5`；開啟 server-side fallback | 這兩個模型不支援強制 `tool_choice`（`any`／`tool`），會回 400 | `lib/agent/llm.ts` | E |
| 6 | 11/27 | LLM 輸出 schema 刻意寬鬆（deadline 為一般字串、evidence 不設 `min(1)`），嚴格檢查移到 `toDraftTasks()` | structured outputs 不一定支援所有 zod 限制 | `lib/agent/schemas/`、`lib/agent/to-draft-tasks.ts` | E |
| 7 | 11/27 | 讀寫原則統一：**讀取**由前端直接查 Supabase（RLS），**寫入**一律經 `/api/*` | 文件中 RLS 段落與架構段落互相矛盾 | 全部 | 全員 |
| 8 | 11/27 | 「提出修改」→ 刪除這份草稿所有「已確認」的票、保留提出修改者的留言、草稿退回 `draft`；`PATCH` 只允許 `draft` 狀態；重新 `submit` 時清空所有確認 | 原規格沒定義 | `drafts/[did]/confirm`、`submit`、`PATCH` | A、C |
| 9 | 11/27 | 確認人數分母 = 送出時已加入的組員（含建立者，送出者自動算一票）；加入人數 < `member_count` 不能送出（409 `MEMBERS_NOT_JOINED`） | 原規格只寫「5/5」 | `drafts/[did]/submit` | A、C |
| 10 | 11/27 | `DraftTask` 新增 `taskId`（新任務為 null）；分工生效時用 upsert 更新原本的 `tasks` 列 | Week 2 求助、協調產生新版本時，才不會讓 `checkins` 對不回原本的任務 | `lib/schemas/division.ts`、`activate_draft()` | A、C、E |
| 11 | 11/27 | 全員確認時呼叫 SQL function `activate_draft(draft_id)`，在同一個 transaction 內寫入任務、更新草稿狀態、刪除非依據訊息 | 原規格沒指定誰在何時刪訊息；Supabase JS client 無法跨表 transaction | migration（C 另寫） | C |
| 12 | 11/27 | 路由參數統一為 `[pid]`、`[iid]`、`[did]`、`[tid]`、`[eid]`、`[code]`、`[token]`；補上 `api/join/`、`api/tasks/`、`auth/callback/` | 文件中 `:id`、`:pid` 混用；API 表有的路徑在資料夾結構中沒有 | `app/` | 全員 |
| 13 | 11/27 | 新增 `lib/schemas/api.ts`（API 請求／回應格式）與統一的錯誤格式 `{ error: { code, message, details? } }` | 前後端需要共同的 API 契約才能平行開發 | `lib/schemas/api.ts`、`lib/api/http.ts` | 全員 |
| 14 | 11/27 | prompt 檔改用 `.ts`（`lib/agent/prompts/*.ts`） | Vercel 部署時 `.md` 不會被打包進 serverless function，執行時讀不到 | `lib/agent/prompts/` | E |
| 15 | 11/27 | 技術版本：Next.js 16（`middleware.ts` 改名 `proxy.ts`）、React 19、Tailwind v4、TypeScript 6、Node 24 LTS | Next.js 16 已是穩定版；測試工具（Vitest 4／Vite 8）需要 Node ≥ 22.12 | `package.json`、`.nvmrc` | 全員 |
| 16 | 11/27 | `tasks.report_every_days` 加上 `check (between 1 and 14)`；Realtime publication 寫進 migration | 與 zod 的範圍一致 | migration | C |
| 17 | 11/27 | 排程備案：Vercel Cron 免費方案一天只能跑一次，**不能**當每 5 分鐘的備案，改用測試模式的手動觸發 | 方案限制 | `api/cron/tick` | D |
| 18 | 11/27 | 助教頁與評語不靠 RLS 保護（助教不是登入使用者），改由 API 驗證 token 後以 secret key 讀取 | 原規格寫「RLS 限定只有助教連結可讀」做不到 | Week 3 | B、C |
| 19 | 11/27 | 新增 `LLM_USE_CACHE=1`：改讀 `eval/cache-demo/` 的預存回應 | demo 備案；沒有 API key 的組員也能走完整條流程 | `lib/agent/extract-division.ts` | E |
| 20 | 11/27 | 開發流程改為**直接 commit 到 `main`**（不用 PR）：push 前 hook 自動跑 `pnpm check`；正式網址改部署 `release` 分支，由 C 更新 | 組內決定：Week 1 只有 4 天，PR 等待成本太高；改用資料夾負責人＋自動檢查＋`release` 分支保護 demo | `CONTRIBUTING.md`、`.githooks/`、Vercel 設定 | 全員 |
| 21 | 11/28 | 逐字稿除了標準格式，也接受 **LINE 聊天記錄匯出檔**，依第一行（`[LINE] …`）自動判斷。貼圖、照片、檔案、影片、語音、通話紀錄、系統訊息（收回、加入退出群組）略過；多行訊息合併；`下午1:05` 轉成 `13:05`；名字超過 20 字只取前 20 字；討論日期取最後一則訊息的日期。`parseTxt()` 的回傳值多一個 `format`（`"line"`／`"standard"`） | 原規格要使用者把逐字稿手動整理成標準格式，太不方便；LINE 是組員實際討論的地方 | `lib/transcript/parse-txt.ts`、`parse-line.ts`（已附測試）；上傳頁說明文字 | A、D、E |
| 22 | 11/28 | 句數上限：超過 300 句（`MAX_MESSAGES`）只保留最後面的 300 句，`parseTxt()` 回傳略過的句數 `dropped`，上傳 API 要讓使用者看到 | LINE 匯出的是群組完整歷史（實測 6 個月、近千則），長逐字稿切塊（E）Week 2 才完成；最新的結論在後面 | `lib/transcript/parse-txt.ts`；`ImportResult` 要加欄位（D 寫 imports API 時與 A 確認） | A、D、E |
| 23 | 11/28 | 標準格式的細節：內容裡的時間（`明天 10:00 集合`）不算發言者；不合法的時間（`25:00`）、不存在的日期當作沒寫；第一句前出現名字超過 20 字的行回 `NAME_TOO_LONG`；有亂碼（U+FFFD）回 `NOT_UTF8`。發言者配對：「包含」與「編輯距離」要求名字至少 2 字、同一步有多位組員符合就不猜；alias 是人確認過的，不參與衝突判斷 | 原規格沒定義；原本的 regex 會把「明天 10」當成發言者 | `lib/transcript/parse-txt.ts`、`match-speakers.ts`（已附測試） | D |

## 已知限制（不修，但要知道）

- 跨行內容如果以「短詞＋冒號」開頭（例如「注意：…」），會被當成發言者「注意」。發言者對應頁會列出這個名字，標成非組員即可；上傳頁提醒避免這種寫法。
- `main` 的預覽網址與 `release` 的正式網址共用同一個 Supabase 資料庫，測試資料會互相看到；demo 前由 C 清掉測試資料。
- `seed.sql` 需要先手動建立測試帳號（`members.user_id` 參照 `auth.users`）。
- LINE 聊天跨多天時，相對日期（「下週五」）都以**最後一則訊息的日期**換算，較早幾天說的期限可能算錯。分工調整頁會同時顯示原文與換算後的日期，組員可以修正；算到過去的日期會出現 `DEADLINE_PAST` 警告。要根治需要每句帶日期（`TranscriptMessage` 加 `date`、`transcript_messages` 加欄位），parser 內部已經算好，等受試者測試前視情況提出（改共用 schema，需 A、C、E 同意）。
- LINE 匯出檔目前只用繁體中文介面的檔案驗證過；英文介面、其他版本的日期行寫法是推測的。

# AGENTS.md — 給 AI coding agent 的工作守則

這份文件給在本 repo 工作的 AI agent（Claude Code、Cursor、Copilot、Codex…）讀。人類組員也應該讀一次，知道 agent 被要求遵守什麼。
開發流程（直接 commit 到 `main`、pull --rebase、衝突處理）見 [`CONTRIBUTING.md`](CONTRIBUTING.md)；程式慣例見 [`docs/conventions.md`](docs/conventions.md)。

## 專案是什麼

大學課程「多媒體」第 4 組的期末專題：一個手機優先的 web app，幫小組**分工、回報進度、求助、協調**。
Week 1（12/1 demo）的核心流程：**上傳討論逐字稿（.txt）→ LLM 抽出分工草稿 → 規則檢查（橘色警告）→ 組員調整 → 全組確認 → 設定回報頻率**。

設計原則（寫功能時要守住）：

- **流程判斷用規則，文字工作才用 LLM**。LLM 的輸出永遠先是「草稿」，要組員確認才生效。
- **LLM 不准猜負責人**：討論中沒有結論就留空。
- **貢獻只記「做了什麼」**，不做分數、比例、排行榜。
- **隱私**：原始逐字稿不保存；檢查人身分前端讀不到；評語只有助教看得到。

## 規格的位置（依優先順序）

1. `lib/schemas/**` 與 `supabase/migrations/**` — **最終版本**，與文件衝突時以程式碼為準
2. `docs/spec-changes.md` — 對原規格的修正
3. `docs/implementation-plan.md` — 完整規格（功能、API、資料表、時程）
4. 檔案開頭的註解與 `TODO(角色)` — 每個 stub 都寫了要做什麼

## 技術版本與容易踩的坑

| 套件 | 版本 | 注意 |
| --- | --- | --- |
| Next.js | 16（App Router） | `params`／`searchParams` 是 **Promise**，要 `await`；`middleware.ts` 已改名為 **`proxy.ts`**；沒有 `next lint`，用 `pnpm lint` |
| React | 19 | |
| TypeScript | 6 | `strict` 開啟 |
| zod | **v4** | 用 `z.uuid()`、`z.email()`（不是 `z.string().uuid()`）；錯誤用 `err.issues`；mock 的 uuid 要是合法的 v4 |
| Tailwind CSS | **v4** | 沒有 `tailwind.config.js`；token 定義在 `app/globals.css` 的 `@theme`，用 `bg-warn`、`text-ink-muted` 等 |
| Supabase | `@supabase/ssr` | 瀏覽器用 `lib/supabase/client.ts`、伺服器用 `server.ts`、繞過 RLS 用 `admin.ts`（只能在 API 裡、權限檢查之後） |
| Claude API | `@anthropic-ai/sdk` | **只能透過 `lib/agent/llm.ts` 的 `generateStructured()` 呼叫**；用 structured outputs，**不要用 `tool_choice` 強制呼叫工具**（`claude-sonnet-5-5`／`claude-haiku-5-5` 會回 400） |
| 測試 | Vitest 4、Playwright | Node 需 ≥ 22.12（建議 24） |
| 套件管理 | **pnpm** | 不要用 npm / yarn |

## 硬規則（違反任何一條都要先停下來問人）

1. **不要 push、不要 commit（除非人類明確要求）**。本 repo 不用 PR，大家直接 commit 到 `main`，所以人類看過你的 diff 就是唯一的 review。絕對不要 `git push --force`、`git push --no-verify`、`git reset --hard`、`git rebase` 改寫已 push 的歷史、更新 `release` 分支或改 GitHub／Vercel 設定。被要求 commit 時只 `git add` 你改的檔案（不要 `git add -A`）。
2. **只改任務需要的檔案**，留在該角色的資料夾內（對照表在 `CONTRIBUTING.md` 第 2-1 節）。不要順手重構、重新命名或重排無關的檔案。
3. **共用檔案不要擅自改**：`lib/schemas/**`、`supabase/migrations/**`、`package.json`、`pnpm-lock.yaml`、`lib/api/**`、`lib/supabase/**`、`lib/env.ts`、`lib/time.ts`、`app/layout.tsx`、`app/globals.css`、`components/ui/**`、設定檔、`AGENTS.md`、`CONTRIBUTING.md`。任務真的需要時，先說明要改什麼、為什麼，等人類同意。
4. **不要修改已存在的 migration 檔**；不要對遠端 Supabase 執行 `db push`、`db reset` 或任何會刪資料的指令。
5. **不要新增套件**，除非人類同意。先找 repo 裡是否已有可用的東西。
6. **讀寫原則**：前端只用 Supabase client「讀」資料；所有「寫入」都經 `/api/*`。
7. **每個 Route Handler** 都要：用 `handle()` 包住、第一步呼叫 `requireUser()` 或 `requireMember()`、用 `parseBody(req, Schema)` 驗證輸入、錯誤用 `throw new ApiError(status, CODE, 中文訊息)`。範例見 `docs/conventions.md`。
8. **型別一律從 `lib/schemas/` import**，不要自己重新定義一份 interface。
9. **日期時間**一律以 Asia/Taipei 計算，用 `lib/time.ts`（`todayInTaipei()`、`toHm()`）。規則函式把 `today` 當參數傳入，方便測試。
10. **LLM**：模型名稱用 `MODELS.sonnet` / `MODELS.haiku`，不要寫死別的模型字串。改 prompt（`lib/agent/prompts/`）之前要知道：改完必須跑 `pnpm eval`，結果記在 `eval/README.md` 的「結果紀錄」。
11. **不要碰秘密**：不要讀出、印出、commit `.env.local` 或任何金鑰；不要在程式碼寫死 key。
12. **UI**：介面文字用**繁體中文**；手機優先（版面寬度 ≤ 480px）；顏色只用 `globals.css` 的 token，不要寫死 `#hex`。
13. **測試**：`lib/transcript/`、`lib/rules/`、`lib/agent/to-draft-tasks.ts` 都是純函式，改了就要有對應的 Vitest 測試（`tests/unit/`）。把 `it.todo` 改成真正的測試。
14. **完成前跑 `pnpm check`**（lint + typecheck + test）。沒過就修到過；修不好就照實回報錯誤訊息，不要說「應該可以了」。

## 常用指令

```bash
pnpm dev            # 開發伺服器 http://localhost:3000
pnpm check          # lint + typecheck + test（完成前必跑）
pnpm test:watch     # 寫純函式時
pnpm build          # 確認可以部署
pnpm format         # Prettier
pnpm eval           # LLM 品質評估（會花 API 費用，只有 E 或改 prompt 時跑）
pnpm db:types       # 重新產生 Supabase 型別（C）
```

## 完成的定義

- [ ] 照 issue 與規格做完，沒有做規格以外的東西
- [ ] `pnpm check` 通過；有動到頁面或 API 的話 `pnpm build` 也通過
- [ ] 沒有留下 `console.log`、被註解掉的程式碼、`any`（真的需要時加註解說明原因）
- [ ] 錯誤情況有處理：未登入、不是組員、輸入格式錯、資料不存在、LLM 失敗
- [ ] 回報給人類：改了哪些檔案、怎麼驗證的、還有什麼沒做或不確定的地方

## 寫 commit 訊息（人類要求你 commit 時）

Conventional Commits，描述用中文：`feat(division): 未指派任務可以點選負責人`。範圍與類型見 `CONTRIBUTING.md` 1-3 節。

# 環境設定

- **第 1 部分：每個人都要做**（約 15 分鐘）
- **第 2 部分：C 做一次**（建立 Supabase、Google 登入、Vercel、Claude API）

---

## 1. 每個人的本機環境

### 1-1. 安裝工具

| 工具 | 版本 | 安裝 |
| --- | --- | --- |
| Node.js | **24 或 26**（最低 22.12） | 最簡單：Windows `winget install OpenJS.NodeJS.LTS`、macOS `brew install node`，或到 [nodejs.org](https://nodejs.org) 下載 LTS。要切換版本的人可用 [fnm](https://github.com/Schniz/fnm)（在 repo 根目錄執行 `fnm use` 會讀 `.nvmrc`）。**裝完要重開終端機** |
| pnpm | 10 | `npm install -g pnpm@10`（新版 Node 已不附 corepack，`corepack enable` 會找不到指令） |
| Git | 任意新版 | Windows 安裝時選 “Checkout as-is, commit as-is”，或事後執行 `git config --global core.autocrlf false` |
| VS Code | — | 打開 repo 時會建議安裝 ESLint、Prettier、Tailwind CSS 擴充套件，全部安裝 |
| GitHub CLI（選用） | — | `gh auth login` 後可以用 `gh pr create` |

確認版本：

```bash
node -v    # v24.x 或 v26.x（至少 v22.12）
pnpm -v    # 10.x
```

> `node -v` 還是舊版本？① 重開終端機；② 有裝 Anaconda 的人（提示字元有 `(base)`），執行 `where.exe node`（macOS：`which -a node`），如果第一個是 conda 裡的 node，先 `conda deactivate` 或在該環境 `conda remove nodejs`。

> Node 低於 22.12 時 `pnpm test` 會出現 `Cannot find native binding` 的錯誤（Vitest 4 需要的 rolldown 不支援）。升級 Node 後**刪掉 `node_modules` 重新 `pnpm install`**。

### 1-2. 取得程式碼

```bash
git clone <repo 網址>
cd g4-app
pnpm install
cp .env.example .env.local     # Windows PowerShell：Copy-Item .env.example .env.local
```

### 1-3. 填 `.env.local`

C 會在群組私下傳 Supabase 與 Claude 的金鑰。**不要貼到 issue、commit 或任何公開的地方**。

| 變數 | 誰需要 | 沒有的話 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 全部 | 頁面可以打開（用 mock 開發），但登入與資料讀取不能用 |
| `SUPABASE_SECRET_KEY` | 寫 API 的人（C、D）、要跑完整流程的人 | API 會回 500 |
| `ANTHROPIC_API_KEY` | E；要測 LLM 的人 | 設 `LLM_USE_CACHE=1` 改用預存回應 |
| `CRON_SECRET` | D（Week 2） | — |

### 1-4. 跑起來

```bash
pnpm dev        # http://localhost:3000
pnpm check      # lint + typecheck + test，應該全部通過
```

手機實測：電腦和手機連同一個 Wi-Fi，`pnpm dev` 顯示的 Network 網址（例如 `http://192.168.x.x:3000`）用手機打開。Google 登入在這個網址不會成功（不在允許清單），要測登入請用 Vercel 預覽網址。

---

## 2. C 做一次：雲端服務

### 2-1. Supabase

1. [supabase.com](https://supabase.com) 建立專案，Region 選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**。資料庫密碼存在密碼管理器裡。
2. **Project Settings → API Keys**：複製 Project URL、publishable key、secret key 到 `.env.local`。
3. 套用 migration：

   ```bash
   pnpm supabase login
   pnpm supabase link --project-ref <專案 ref>     # ref 是網址 https://<ref>.supabase.co 的那段
   pnpm supabase db push                          # 套用 supabase/migrations/ 裡的檔案
   pnpm db:types                                  # 產生 lib/supabase/types.ts，commit 它
   ```

   第一次執行 `supabase link` 前如果沒有 `supabase/config.toml`，先執行 `pnpm supabase init`（遇到「是否覆蓋」的問題選 No，保留現有的 `migrations/`）。

4. **Database → Extensions**：Week 2 前開啟 `pg_cron`、`pg_net`、`vector`。

### 2-2. Google 登入

1. [Google Cloud Console](https://console.cloud.google.com) → 新增專案 → **APIs & Services → OAuth consent screen**：User type 選 External，填 app 名稱與聯絡信箱；測試階段把五位組員和受試者的 Google 帳號加進 Test users。
2. **Credentials → Create credentials → OAuth client ID**：類型選 Web application；Authorized redirect URIs 填
   `https://<專案 ref>.supabase.co/auth/v1/callback`
3. 把 Client ID 與 Client secret 填到 Supabase **Authentication → Sign In / Providers → Google**，開啟。
4. Supabase **Authentication → URL Configuration**：
   - Site URL：正式網址（例如 `https://g4-app.vercel.app`）
   - Redirect URLs：
     - `http://localhost:3000/**`
     - `https://g4-app.vercel.app/**`
     - `https://*-<vercel 團隊名>.vercel.app/**`（`main` 等分支的預覽網址）
5. Email magic link 預設就開著；免費方案每小時只能寄少量信，測試時以 Google 登入為主。

### 2-3. Vercel

1. [vercel.com](https://vercel.com) → Add New Project → Import GitHub repo（Framework 自動偵測為 Next.js）。
2. **Settings → Environment Variables**：把 `.env.example` 的變數都填上（Production 與 Preview 都要）。`NEXT_PUBLIC_SITE_URL` 在 Production 填正式網址。
3. **Settings → Environments → Production → Branch Tracking**：Production branch 改成 **`release`**（先在本機 `git push origin main:release` 建立這個分支）。
4. 之後：
   - push 到 `main` → 自動部署到固定的預覽網址 `g4-app-git-main-<團隊>.vercel.app`（大家的測試站）
   - C 執行 `git push origin main:release` → 部署到正式網址（demo、給受試者用）
   - 這樣 `main` 偶爾壞掉也不會影響正式網址（見 `CONTRIBUTING.md` 第 7 節）

### 2-4. Claude API

1. [console.anthropic.com](https://console.anthropic.com) 建立 API key，命名 `g4-app`。
2. **Settings → Limits** 設定每月花費上限（例如 USD 20），避免程式 bug 造成大量呼叫。
3. key 填到 `.env.local` 與 Vercel 環境變數；私下傳給 E。

### 2-5.（選用）本機 Supabase

想在不影響雲端資料的情況下測 migration：裝 Docker Desktop，然後

```bash
pnpm supabase start      # 本機 Postgres + Studio（http://localhost:54323）
pnpm supabase db reset   # 重跑所有 migration 與 seed.sql
```

把 `.env.local` 的 Supabase 變數換成 `supabase start` 印出來的本機值。

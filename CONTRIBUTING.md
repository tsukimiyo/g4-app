# 開發流程（每個人、每個 AI agent 都照這份做）

> 這份文件回答三個問題：**改動怎麼進到 main**、**怎麼避免衝突**、**衝突了怎麼辦**。
> 用 AI agent（Claude Code、Cursor、Copilot…）實作的人，另外讓 agent 讀 [`AGENTS.md`](AGENTS.md)。

## 0. 一句話規則

**直接 commit 到 `main`，不用開 PR。但每次 push 前一定先 `git pull --rebase`，並且 `pnpm check` 要通過（hook 會自動跑）。**

我們用的是 *trunk-based development*：大家都在 `main` 上工作，小步 commit、常常 push。少了 PR 的 review，所以靠下面四個機制保護：

| 機制 | 擋住什麼 |
| --- | --- |
| **資料夾負責人**（第 2 節） | 兩個人改同一個檔案 → 衝突 |
| **pre-push hook**：push 前自動跑 `pnpm check` | 把壞掉的程式推上 `main` |
| **CI**：每次 push 到 `main` 都跑 lint、型別、測試、build | hook 被略過時，至少馬上知道 `main` 壞了 |
| **`release` 分支**：正式網址只部署 `release`，由 C 確認穩定後才更新 | `main` 壞掉影響 demo |

---

## 1. 第一次設定（每個人做一次）

```bash
git config --global pull.rebase true        # git pull 一律用 rebase，不產生多餘的 merge commit
git config --global rebase.autoStash true   # pull 時自動暫存還沒 commit 的改動
git config --global core.autocrlf false     # 換行統一 LF（Windows 必做）
pnpm install                                # 會自動啟用 .githooks/（push 前跑 pnpm check）
```

確認 hook 有啟用：`git config core.hooksPath` 應該顯示 `.githooks`。

---

## 2. 每天的流程

### 2-1. 開工前

```bash
git pull                 # 拿到大家最新的改動（已設定成 rebase）
pnpm install             # 有人加了套件的話才需要；不確定就跑一次
```

### 2-2. 開發與 commit

```bash
pnpm dev                 # http://localhost:3000
pnpm test:watch          # 寫 parser／規則時開著
```

**小步 commit**：每完成一個能運作的小單位就 commit 一次（例如「警告橫幅可以顯示」），不要累積一整天。

```bash
git add <你改的檔案>      # 不要用 git add -A，避免把別人的東西或暫存檔一起加進去
git commit -m "feat(division): 未指派任務可以點選負責人"
```

commit 格式（[Conventional Commits](https://www.conventionalcommits.org/)，描述用中文）：

```
<類型>(<範圍>): <做了什麼>

feat(division): 未指派任務可以點選負責人
fix(parser): 跨行網址不再被當成發言者
test(rules): 補上 DEADLINE_PAST 的邊界測試
docs: 更新 setup.md 的 Google OAuth 步驟
chore(deps): 加入 qrcode
contract(schemas): DraftTask 新增 taskId        ← 改共用契約專用，見 3-2
```

- 類型：`feat` 新功能、`fix` 修 bug、`test`、`docs`、`refactor`、`style`（只改格式）、`chore`（設定、套件）、`contract`（改共用契約）
- 範圍：`division`、`parser`、`rules`、`agent`、`api`、`db`、`ui`、`auth`、`eval`…
- 對應 issue 的話在最後加 `(#12)`

### 2-3. push

```bash
git pull                 # 先把別人的改動接上來；有衝突照第 4 節處理
git push                 # hook 會自動跑 pnpm check（約 30 秒），沒過就不會推上去
```

- **至少每半天 push 一次**。改動放在自己電腦越久，之後衝突越大。
- 還沒做完的功能也可以 push，只要 `pnpm check` 會過、而且不會讓別人的頁面壞掉（還沒好的畫面保留 `<PagePlaceholder />`，還沒好的 API 保留 `notImplemented()`）。
- hook 只有在 push 的內容**全部是 `.md` 檔**時會跳過檢查。
- **不要用 `git push --no-verify` 跳過檢查**。真的有緊急狀況，push 後馬上在群組說。

### 2-4. push 之後

- 改到**共用檔案**、或做好了**別人在等的東西**（第 5 節的交付點）→ 在群組說一聲：「`validateDivision` 已 push，可以 pull 了」。
- GitHub Actions 的 CI 變紅（GitHub 會寄信，repo 首頁的 commit 旁邊也會出現紅色 ✗）→ **弄壞的人立刻修**，30 分鐘內修不好就 `git revert <commit>` 先退掉。

---

## 3. 怎麼避免衝突

衝突幾乎都來自「兩個人改同一個檔案的同一區塊」。所以最有效的方法是：**每個人只改自己的資料夾，共用檔案改之前先講。**

### 3-1. 資料夾負責人

| 角色 | 主要負責（可以直接改） |
| --- | --- |
| A｜前端（分工與回報） | `app/p/[pid]/division/**`、`components/division/**`、之後的 `report/`、`summary/`、`evaluate/` |
| B｜前端（框架、事件、聊天） | `app/login/`、`app/auth/`、`app/join/`、`app/p/new/`、`app/p/[pid]/page.tsx`、`invite/`、`components/ui/**`、`app/layout.tsx`、`app/globals.css`、`lib/supabase/proxy.ts` |
| C｜後端（資料與 API） | `app/api/**`（`imports/` 與 `cron/` 除外）、`supabase/**`、`lib/api/**`、`lib/supabase/**` |
| D｜後端（逐字稿與規則） | `lib/transcript/**`（`chunk.ts` 除外）、`lib/rules/**`、`app/api/projects/[pid]/imports/`、`app/api/imports/**`、`app/api/cron/` |
| E｜Agent／AI | `lib/agent/**`、`lib/transcript/chunk.ts`、`eval/**` |
| 各自 | `tests/unit/` 裡自己模組的測試 |

要改別人的資料夾：**先問負責人**，或請他改。小修正（typo、明顯的 bug）可以直接改，但 push 後要告訴負責人。

### 3-2. 共用檔案（改之前先在群組講）

這些檔案是大家的「契約」，改了會影響別人：

| 檔案 | 誰最常改 | 規則 |
| --- | --- | --- |
| `lib/schemas/**` | A、C、E | 見下方「改契約的步驟」 |
| `supabase/migrations/**` | C | 只**新增**檔案，**絕不修改**已經套用的 migration（見 3-3） |
| `package.json`、`pnpm-lock.yaml` | 任何人 | 加套件前在群組說（見 3-4） |
| `lib/api/**`、`lib/supabase/**`、`lib/env.ts`、`lib/time.ts` | C | 改函式簽名前先問 |
| `app/layout.tsx`、`app/globals.css`、`components/ui/**` | B | 色碼、token 統一由 B 改 |
| `.githooks/**`、`.github/**`、`eslint.config.mjs`、`tsconfig.json`、`AGENTS.md`、`CONTRIBUTING.md` | 任何人 | 改流程或規則前先講 |
| `docs/implementation-plan.md`、`docs/spec-changes.md` | 任何人 | 改規格照 `spec-changes.md` 開頭的流程 |

**改契約的步驟**（例如 `DraftTask` 要加欄位）：

1. 群組說：「我要在 `DraftTask` 加 `xxx`，影響 A、C」，等受影響的人回覆沒問題。
2. `git pull`，**只改契約相關的檔案**（schema＋對應的 `mocks/`＋`spec-changes.md` 加一列），不要混入其他功能。
3. `git commit -m "contract(schemas): DraftTask 新增 xxx"`，**馬上 push**。
4. 群組說「已 push」，其他人 `git pull`。

### 3-3. 資料庫 migration

- 只有 C 套用 migration 到 Supabase。其他人需要改資料表 → 跟 C 說，或自己新增 migration 檔後請 C 檢查並套用。
- 新增 migration：`pnpm supabase migration new add_checkins`（檔名自動帶時間戳，不會和別人撞名）。
- **已經 push 到 Supabase 的 migration 檔絕對不要再改**，要改就再新增一個。
- 改完 migration 一定要跑 `pnpm db:types`，把 `lib/supabase/types.ts` 一起 commit。

### 3-4. 套件與 lockfile

- 只用 **pnpm**（不要用 `npm install`，會產生 `package-lock.json`，已被 `.gitignore` 擋掉）。
- 加套件：群組說一聲 → `git pull` → `pnpm add <套件>` → **只 commit `package.json` 和 `pnpm-lock.yaml`** → 馬上 push。
- **`pnpm-lock.yaml` 衝突時絕對不要手動改**，照 4-2 重新產生。

### 3-5. 其他習慣

- **不要順手重排別人的檔案**（改縮排、改 import 順序、全檔 format）。VS Code 開 Format on Save 沒問題，專案已統一用 Prettier。
- **不要用 `git add -A` 或 `git add .`**，只加自己改的檔案；commit 前用 `git status` 看一下。
- **永遠不要 `git push --force`**（`main` 已設定禁止 force push）。
- 換行統一 LF（`.gitattributes` 已設定）。如果看到整個檔案都變成 diff，確認 `core.autocrlf` 是 `false` 後重新 clone。

### 3-6. 什麼時候可以開自己的分支

不強制，但遇到下面情況建議在本機開分支，做完再接回 `main`：

- 要做大範圍的嘗試，不確定會不會留下來
- 要改很多共用檔案（例如重構 API 共用工具）

```bash
git switch -c c/refactor-api        # 開分支
# …開發、commit…
git switch main && git pull
git switch c/refactor-api && git rebase main   # 把 main 接上來，解衝突
git switch main && git merge --ff-only c/refactor-api
git push
git branch -d c/refactor-api
```

---

## 4. 衝突了怎麼辦

### 4-1. `git pull` 時出現衝突

```bash
git pull
# CONFLICT (content): Merge conflict in xxx
```

1. `git status` 看哪些檔案衝突。
2. 打開檔案，找 `<<<<<<<`、`=======`、`>>>>>>>`。因為我們用 rebase：
   - **上半部（HEAD）是別人已經 push 的版本**
   - **下半部是你自己的 commit**
   （跟一般 merge 剛好相反，很容易搞混）
3. 改成正確的結果（通常兩邊都要保留），刪掉標記。不確定別人那段的意思 → **問那個人，不要猜**。VS Code 的衝突編輯器（Accept Both Changes 等按鈕）很好用。
4. ```bash
   git add <檔案>
   git rebase --continue
   ```
5. 全部解完：`pnpm check` 確認沒壞，再 `git push`。
6. 搞砸了想重來：`git rebase --abort`，一切回到 pull 之前（你的 commit 不會不見）。

### 4-2. `pnpm-lock.yaml` 衝突

```bash
git checkout origin/main -- pnpm-lock.yaml   # 先拿別人已 push 的版本
pnpm install                                  # 依照合併後的 package.json 重新產生
git add pnpm-lock.yaml
git rebase --continue
```

`package.json` 同時衝突的話，先手動合併 `package.json`（兩邊的套件都留著），再做上面的步驟。

### 4-3. `lib/supabase/types.ts` 衝突

這是自動產生的檔案，不要手動合併：先解完 migration 的衝突，再重跑 `pnpm db:types`。

### 4-4. 不小心 push 了壞掉的東西

```bash
git revert <commit-hash>     # 產生一個「反向」的 commit，安全，不會改寫歷史
git push
```

不要用 `git reset` 加 force push 修正已經 push 的 commit。

---

## 5. Week 1 的交付順序

沒有 PR 之後，**「做好了 → push → 群組通知」就是交接**。Week 1 誰等誰、誰要先動工、每個交付點的期限，見 [`docs/roles.md`](docs/roles.md)「Week 1 先後順序」。

---

## 6. 用 AI agent 實作的規則

可以用，而且鼓勵用。但**你要為 agent 產生的每一行負責**，而且沒有 PR review 了，你自己就是唯一的 reviewer。

1. **一個工作開一個 agent session**，開場就給它：要做什麼＋規格的位置＋「先讀 AGENTS.md」。
2. **agent 不准 push**。commit 也要等你看過 diff（`git diff`）再做，或明確叫它 commit。
3. 看不懂的地方問 agent 或刪掉，不要直接送出。
4. agent 想改共用檔案（第 3-2 節）、加套件、改 migration → 停下來，照本文件的規則先跟組員講。
5. agent 說「完成」之前一定要跑過 `pnpm check`，並照實列出改了哪些檔案、測了什麼、沒測什麼。
6. 不要把 `.env.local`、API key 貼給 agent；組員的真實逐字稿只放在 `eval/transcripts/`（取得同意後）。

給 agent 的開場範例：

```
請先讀 AGENTS.md 和 CONTRIBUTING.md。
任務：分工調整頁的「未指派選人」。
規格：docs/implementation-plan.md「八個步驟與實作方式」第 6 步；型別在 lib/schemas/division.ts。
只改 components/division/ 和 app/p/[pid]/division/edit/。先用 mocks/division-draft.json 開發。
完成後跑 pnpm check，列出你改了哪些檔案。不要 commit、不要 push，我看過 diff 再自己 commit。
```

---

## 7. 特殊時段

| 時間 | 規則 |
| --- | --- |
| **11/30（一）21:00 凍結** | C 把當下的 `main` 推到 `release`（正式網址），全組在正式網址彩排。之後 `main` 照常可以 push，但**只有 C 可以更新 `release`**，而且只更新 demo 必要的修正 |
| **12/1 demo 當天** | 不更新 `release` |
| **每週日** | 全組在 `main` 的預覽網址點過一遍，沒問題由 C 更新 `release` |

更新 `release`（C 執行）：

```bash
git switch main && git pull
git push origin main:release
```

---

## 8. repo 設定（建立者做一次）

GitHub → Settings：

- **Collaborators**：邀請四位組員（Write 權限）
- **Rules → Rulesets → New branch ruleset**，Target 選 `main` 與 `release`：
  - ✅ **Block force pushes**
  - ✅ **Restrict deletions**
  - ❌ **不要**勾 Require a pull request（我們直接 push）
- `release` 分支：`git push origin main:release` 建立一次

Vercel → Project → Settings → **Environments → Production → Branch Tracking**：Production branch 改成 `release`。之後 `main` 的每次 push 只會產生預覽網址（`g4-app-git-main-<團隊>.vercel.app`，網址固定，可以當測試站）。

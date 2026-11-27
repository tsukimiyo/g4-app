# 程式慣例

大家（和 AI agent）寫出來的程式長得一樣，別人接手才快、衝突才少。我們不用 PR review，所以這份慣例就是品質的底線。

## 命名

| 東西 | 規則 | 例子 |
| --- | --- | --- |
| TypeScript 變數、函式、物件欄位 | camelCase | `finalDeadline`、`validateDivision()` |
| 資料庫表與欄位 | snake_case | `final_deadline`、`division_drafts` |
| React 元件與檔名 | PascalCase | `DivisionEditor.tsx` |
| 其他檔名 | kebab-case | `parse-txt.ts`、`validate-division.ts` |
| zod schema | PascalCase，型別同名 | `export const DraftTask = z.object(...)`；`export type DraftTask = z.infer<typeof DraftTask>` |
| API 錯誤碼 | SCREAMING_SNAKE_CASE | `NOT_MEMBER`、`DRAFT_HAS_WARNINGS` |
| 路由參數 | 固定名稱 | `[pid]` 專題、`[iid]` 匯入、`[did]` 草稿、`[tid]` 任務、`[eid]` 事件、`[code]` 邀請碼、`[token]` 助教連結 |

DB（snake_case）↔ TypeScript（camelCase）的轉換寫在 API 裡，前端拿到的永遠是 camelCase（`lib/schemas/` 的形狀）。

## 讀寫原則

```
前端 ──讀──▶ Supabase（RLS 保護，只能讀自己專題的資料）
前端 ──寫──▶ /api/*  ──檢查權限──▶ Supabase（secret key）
```

- 前端讀資料：Client Component 用 `lib/supabase/client.ts`，Server Component 用 `lib/supabase/server.ts`。
- 前端**永遠不直接 insert / update / delete**。RLS 只開了 select，直接寫會失敗。
- 原因：「有警告不能送出」「全員確認才生效」這類規則只寫在 API 一個地方。

## API 寫法

每個 Route Handler 都長這樣：

```ts
// app/api/drafts/[did]/route.ts
import { ApiError, handle, json, parseBody, type Ctx } from "@/lib/api/http";
import { requireMember } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { UpdateDraftInput } from "@/lib/schemas/api";

export const PATCH = handle(async (req: Request, ctx: Ctx<"did">) => {
  const { did } = await ctx.params;                       // 1. 取參數（Next.js 16 是 Promise）
  const input = await parseBody(req, UpdateDraftInput);   // 2. 驗證輸入（失敗自動回 400）

  const db = createAdminClient();
  const { data: draft } = await db.from("division_drafts").select("*").eq("id", did).maybeSingle();
  if (!draft) throw new ApiError(404, "DRAFT_NOT_FOUND", "找不到這份草稿");

  await requireMember(draft.project_id);                  // 3. 權限檢查（一定要在任何寫入之前）
  if (draft.status !== "draft") {
    throw new ApiError(409, "DRAFT_LOCKED", "草稿已送出確認，要先有人提出修改才能編輯");
  }

  // 4. 寫入 …
  return json({ draft: /* camelCase */, warnings: [] });  // 5. 回傳 lib/schemas 定義的形狀
});
```

### HTTP 狀態碼與錯誤碼

錯誤一律回 `{ error: { code, message, details? } }`，`message` 是可以直接顯示給使用者的中文。

| 狀態 | 什麼時候 | 錯誤碼範例 |
| --- | --- | --- |
| 400 | 輸入格式錯 | `VALIDATION_FAILED`（自動）、`INVALID_JSON`、`NOT_UTF8` |
| 401 | 沒登入 | `UNAUTHENTICATED` |
| 403 | 登入了但沒權限 | `NOT_MEMBER`、`NOT_ASSIGNEE` |
| 404 | 不存在 | `DRAFT_NOT_FOUND`、`INVITE_INVALID` |
| 409 | 狀態不允許 | `DRAFT_LOCKED`、`DRAFT_HAS_WARNINGS`、`MEMBERS_NOT_JOINED`、`PROJECT_FULL` |
| 413 / 415 / 422 | 上傳檔案 | `FILE_TOO_LARGE`、`NOT_TXT`、`TRANSCRIPT_INVALID` |
| 501 | stub 還沒實作 | `NOT_IMPLEMENTED` |
| 502 | 外部服務失敗 | `LLM_FAILED` |

新增錯誤碼時直接用，不用登記；但前端要特別處理的錯誤碼請在 push 後告訴前端（群組或 issue）。

### 前端呼叫 API

```ts
const res = await fetch(`/api/drafts/${did}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tasks } satisfies UpdateDraftInput),
});
const body = await res.json();
if (!res.ok) {
  // body.error.code 決定怎麼處理；body.error.message 可以直接顯示
}
```

## 表單

React Hook Form＋zod，schema 直接用 `lib/schemas/api.ts` 的：

```tsx
const form = useForm({ resolver: zodResolver(CreateProjectInput) });
```

## 日期與時間

- 全部以 **Asia/Taipei** 為準。「今天」用 `todayInTaipei()`，不要用 `new Date().toISOString().slice(0, 10)`（那是 UTC，晚上 8 點後會差一天）。
- 日期在程式裡傳 `YYYY-MM-DD` 字串，不傳 `Date` 物件。
- 時間 `HH:MM`；DB 的 `time` 欄位讀出來是 `HH:MM:SS`，用 `toHm()` 轉。
- 規則函式（`validateDivision`、`suggestFrequency`）把 `today` 當參數，不要在函式裡自己取現在時間。

## UI

- 手機優先：`app/layout.tsx` 已把內容限制在 480px 寬。先在瀏覽器 DevTools 的手機模式（例如 Pixel 7）開發。
- 顏色只用 `app/globals.css` 定義的 token：`bg-surface`、`text-ink`、`text-ink-muted`、`border-line`、`bg-brand`、`bg-warn`／`bg-warn-soft`（需要協調、警告）、`bg-danger`（Agent 介入）、`bg-changed`（分工變更的黃色標記）、`text-ok`。
- 介面文字用繁體中文、全形標點。
- 還沒做好的頁面保留 `<PagePlaceholder />`，做好時整個換掉。

## 測試

- 純函式（`lib/transcript/`、`lib/rules/`、`lib/agent/to-draft-tasks.ts`）：Vitest，放 `tests/unit/<模組>.test.ts`。
- 先把 `it.todo("…")` 改成 `it("…", () => { … })`，再實作——規格已經寫在 todo 裡了。
- `mocks/` 改了或 `lib/schemas/` 改了，`tests/unit/mocks.test.ts` 會檢查兩者是否一致。
- 情境測試（Playwright，`tests/e2e/`）Week 3 由 D 建立。

## 註解與 TODO

- 檔案開頭寫 owner 與規格位置（stub 已經寫好）。
- 未完成的地方寫 `// TODO(角色)：…`，例如 `// TODO(C)：人數已滿時回 409`，方便 `grep TODO\(C\)` 找自己的工作。

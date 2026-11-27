# mocks/

API 完成前，前端用這些 JSON 開發畫面。內容對應 `eval/transcripts/script-silent-member.txt`
（prototype 劇本：冠廷在討論中沒發言 → 影片沒人負責 → 橘色警告）。

| 檔案 | 對應 | 說明 |
| --- | --- | --- |
| `members.json` | 專題組員 | 5 位組員與最終截止日 |
| `division-draft.json` | `DraftWithWarnings`（`POST /api/imports/[iid]/extract` 的回傳） | 草稿＋3 則警告 |

規則：

- 這些檔案**必須**通過 `lib/schemas/` 的驗證，`tests/unit/mocks.test.ts` 會檢查。改 schema 時一併更新 mock，否則 CI 會失敗。
- id 一律用 `crypto.randomUUID()` 產生（zod v4 的 `z.uuid()` 會拒絕 `00000000-...-0001` 這種假 id）。
- 需要新的 mock（例如 `ImportResult`）就新增檔案並在 `mocks.test.ts` 加一行驗證。

// Week 1 API 的請求與回應格式。前端（A、B）呼叫 API、後端（C、D）驗證輸入都用這份。
// 規格：docs/implementation-plan.md「資料模型與 API → Week 1 Core 的 API」
// ⚠️ 共用契約：修改前先在群組通知前後端
import { z } from "zod";
import { DivisionWarning } from "./division";
import { DraftTask } from "./division";
import { id, ymd } from "./common";

// ---------- 統一的錯誤格式（所有 API 都用 lib/api/http.ts 產生） ----------
export const ApiErrorBody = z.object({
  error: z.object({
    code: z.string(), // 例如 "VALIDATION_FAILED"、"NOT_MEMBER"、"DRAFT_HAS_WARNINGS"
    message: z.string(), // 可以直接顯示給使用者的中文訊息
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

// ---------- POST /api/projects ----------
export const CreateProjectInput = z.object({
  course: z.string().min(1).max(60),
  teamName: z.string().min(1).max(40),
  title: z.string().min(1).max(60),
  memberCount: z.number().int().min(2).max(10),
  finalDeadline: ymd,
  taEmails: z.array(z.email()).max(5).default([]),
  displayName: z.string().min(1).max(20), // 建立者自己的顯示名稱
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

// ---------- POST /api/join/[code] ----------
export const JoinInput = z.object({
  displayName: z.string().min(1).max(20),
});
export type JoinInput = z.infer<typeof JoinInput>;

// ---------- POST /api/projects/[pid]/imports（multipart/form-data，欄位名 file） ----------
export const ImportResult = z.object({
  importId: id,
  messageCount: z.number().int(),
  meetingDate: ymd.nullable(),
  speakers: z.array(
    z.object({
      speakerRaw: z.string(),
      suggestedMemberId: id.nullable(), // null = 配對不到，或建議標為非組員
      matchedBy: z.enum(["alias", "exact", "contains", "edit_distance", "none"]),
    }),
  ),
});
export type ImportResult = z.infer<typeof ImportResult>;

// ---------- PUT /api/imports/[iid]/speakers ----------
export const SpeakerMappingInput = z.object({
  meetingDate: ymd, // 逐字稿第一行沒寫日期時，由上傳者在這一步補上
  mappings: z.array(
    z.object({
      speakerRaw: z.string(),
      memberId: id.nullable(), // null = 非組員，忽略
    }),
  ),
});
export type SpeakerMappingInput = z.infer<typeof SpeakerMappingInput>;

// ---------- PATCH /api/drafts/[did] ----------
export const UpdateDraftInput = z.object({
  tasks: z.array(DraftTask),
  openQuestions: z.array(z.string()).optional(),
});
export type UpdateDraftInput = z.infer<typeof UpdateDraftInput>;

// ---------- POST /api/drafts/[did]/confirm ----------
export const ConfirmInput = z.discriminatedUnion("result", [
  z.object({ result: z.literal("confirmed") }),
  z.object({ result: z.literal("change_requested"), comment: z.string().min(1).max(200) }),
]);
export type ConfirmInput = z.infer<typeof ConfirmInput>;

export const ConfirmResult = z.object({
  status: z.enum(["draft", "pending", "active"]),
  confirmed: z.number().int(), // 已確認人數
  total: z.number().int(), // 組員人數（分母）
});
export type ConfirmResult = z.infer<typeof ConfirmResult>;

// ---------- POST /api/drafts/[did]/submit 失敗時 details 的格式 ----------
export const SubmitRejectedDetails = z.object({
  warnings: z.array(DivisionWarning),
});

// ---------- PUT /api/tasks/[tid]/frequency ----------
export const FrequencyInput = z.object({
  reportEveryDays: z.number().int().min(1).max(14),
  reportTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type FrequencyInput = z.infer<typeof FrequencyInput>;

// 逐字稿 → 分工草稿的整條流程。owner：E；由 POST /api/imports/[iid]/extract 呼叫（C 串接）。
import "server-only";
import type { TranscriptMessage } from "@/lib/schemas/transcript";
import type { DraftTask } from "@/lib/schemas/division";

export type ExtractDivisionResult = {
  tasks: DraftTask[];
  openQuestions: string[];
  llmRaw: unknown; // 存進 division_drafts.llm_raw，方便除錯與 eval
  fromCache: boolean;
};

/**
 * 步驟：
 * 1. 把 messages 格式化成 "[#idx MM/DD HH:MM 名字] 內容"（memberId 為 null 的非組員也要保留，當作上下文）
 * 2. LLM_USE_CACHE=1 時改讀 eval/cache-demo/<hash>.json（demo 備案）
 * 3. 呼叫 generateStructured({ model: MODELS.sonnet, schema: LlmDivisionOutput, ... })
 *    - PARSE_FAILED 重試一次；再失敗丟出錯誤，由 API 回 502，前端提示改走手動分配
 * 4. toDraftTasks() 過濾與補欄位
 * 5.（12/2 之後）超過約 30k tokens 時依時段切塊（lib/transcript/chunk.ts），各自抽取再合併
 */
export async function extractDivision(_input: {
  messages: TranscriptMessage[];
  members: { id: string; name: string }[];
  finalDeadline: string;
  meetingDate: string;
}): Promise<ExtractDivisionResult> {
  // TODO(E)
  throw new Error("extractDivision 尚未實作");
}

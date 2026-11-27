// Claude API 封裝。owner：E
// 所有 LLM 呼叫都經過這裡，不要在其他地方 new Anthropic()。
//
// 重點：
// - 用 structured outputs（output_config.format）強制 JSON，不用 tool_choice 強制呼叫工具
//   （Sonnet 5.5 / Haiku 5.5 不支援 tool_choice: "any" / "tool"，會回 400）
// - fallbacks: "default"：模型因安全政策拒答時，由伺服器自動改用預設的備援模型重試；
//   不支援 fallback 的模型會忽略它，照常回應
// - 解析失敗重試一次；再失敗由呼叫端退回手動分配（見 implementation-plan「安全與可控」）
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODELS = {
  /** 逐字稿抽取分工、協調方案、期末摘要 */
  sonnet: "claude-sonnet-5-5",
  /** 疑問改寫、分類 */
  haiku: "claude-haiku-5-5",
} as const;
export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export class LlmError extends Error {
  constructor(
    public readonly reason: "REFUSAL" | "MAX_TOKENS" | "PARSE_FAILED",
    message: string,
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // 讀環境變數 ANTHROPIC_API_KEY
  client ??= new Anthropic();
  return client;
}

export type StructuredCall<S extends z.ZodType> = {
  model: ModelId;
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
};

export async function generateStructured<S extends z.ZodType>(
  call: StructuredCall<S>,
): Promise<{ data: z.infer<S>; raw: Anthropic.Beta.BetaMessage }> {
  const response = await getClient().beta.messages.parse({
    model: call.model,
    max_tokens: call.maxTokens ?? 16000,
    system: call.system,
    messages: [{ role: "user", content: call.user }],
    output_config: {
      format: betaZodOutputFormat(call.schema),
      ...(call.effort ? { effort: call.effort } : {}),
    },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal") {
    throw new LlmError("REFUSAL", "模型拒絕回應這份內容");
  }
  if (response.stop_reason === "max_tokens") {
    throw new LlmError("MAX_TOKENS", "輸出超過 max_tokens，內容可能被截斷");
  }
  if (response.parsed_output == null) {
    throw new LlmError("PARSE_FAILED", "模型輸出不符合 schema");
  }
  return { data: response.parsed_output as z.infer<S>, raw: response };
}

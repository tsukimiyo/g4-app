// 長逐字稿切塊（12/2–12/6）。owner：E
// 12/1 demo 不切塊（demo 逐字稿控制在 200 句以內）。
import type { TranscriptMessage } from "@/lib/schemas/transcript";

/** 依時段把訊息切成數塊，每塊約 maxTokens；塊與塊之間保留幾句重疊當作上下文 */
export function chunkMessages(
  _messages: TranscriptMessage[],
  _maxTokens = 30_000,
): TranscriptMessage[][] {
  // TODO(E)
  throw new Error("chunkMessages 尚未實作");
}

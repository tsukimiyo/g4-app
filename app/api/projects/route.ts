// POST /api/projects — 建立專題
// owner：C（W1）｜規格：docs/implementation-plan.md「Week 1 Core 的 API」
import { handle, notImplemented, parseBody } from "@/lib/api/http";
import { CreateProjectInput } from "@/lib/schemas/api";

export const POST = handle(async (req: Request) => {
  const input = await parseBody(req, CreateProjectInput);

  // 1. requireUser()
  // 2. insert projects（created_by = user.id）
  // 3. insert members（建立者，color 取色盤第 0 個）
  // 4. 回傳 { project, member }

  void [input];
  return notImplemented("POST /api/projects");
});

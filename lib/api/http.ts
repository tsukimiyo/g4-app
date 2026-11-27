// 所有 Route Handler 共用的回應與錯誤處理。用法見 docs/conventions.md「API 寫法」。
import { z } from "zod";
import type { ApiErrorBody } from "@/lib/schemas/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

function errorResponse(status: number, body: ApiErrorBody): Response {
  return Response.json(body, { status });
}

/**
 * 包住 Route Handler：把 ApiError / ZodError / 其他例外統一轉成 { error: { code, message } }。
 *
 *   export const POST = handle(async (req: Request, ctx: Ctx<"pid">) => { ... });
 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.status, {
          error: { code: err.code, message: err.message, details: err.details },
        });
      }
      if (err instanceof z.ZodError) {
        return errorResponse(400, {
          error: { code: "VALIDATION_FAILED", message: "輸入格式不正確", details: err.issues },
        });
      }
      console.error(err);
      return errorResponse(500, {
        error: { code: "INTERNAL", message: "伺服器發生錯誤，請稍後再試" },
      });
    }
  };
}

/** 讀 JSON body 並用 zod 驗證；失敗會丟 ZodError，由 handle() 轉成 400 */
export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "請求內容不是合法的 JSON");
  }
  return schema.parse(body);
}

/** 動態路由的 ctx 型別：Ctx<"pid"> = { params: Promise<{ pid: string }> } */
export type Ctx<K extends string> = { params: Promise<Record<K, string>> };

/** stub 用：尚未實作的 API 回傳 501 */
export function notImplemented(what: string): never {
  throw new ApiError(501, "NOT_IMPLEMENTED", `${what} 尚未實作`);
}

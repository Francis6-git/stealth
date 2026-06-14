import { z, type ZodType } from "zod";

import { ApiError } from "./errors";

const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

function assertJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "bad_request", "Content-Type must be application/json");
  }
}

export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  assertJsonContentType(request);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    throw new ApiError(413, "bad_request", `Request body exceeds ${maxBytes} bytes`);
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiError(413, "bad_request", `Request body exceeds ${maxBytes} bytes`);
  }

  try {
    return schema.parse(JSON.parse(body));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError(400, "bad_request", "Request body contains invalid JSON");
    }
    throw error;
  }
}

export function parseSearchParams<T>(request: Request, schema: ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

export const paginationSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export { DEFAULT_MAX_BODY_BYTES };

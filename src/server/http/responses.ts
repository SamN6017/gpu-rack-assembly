import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { DomainError } from "../services/transaction";
import { paginationSchema } from "@/domain/manufacturing/schemas";
export function authorize(request: Request): void {
  const configured = process.env.MANUFACTURING_API_TOKEN;
  if (!configured || configured.length < 32)
    throw new DomainError(
      "API_NOT_CONFIGURED",
      "Manufacturing API access is not configured",
      503,
    );
  const supplied =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const a = Buffer.from(configured),
    b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    throw new DomainError(
      "UNAUTHORIZED",
      "A valid manufacturing API token is required",
      401,
    );
}
export function page(request: Request) {
  return paginationSchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
}
export async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new DomainError("CONTENT_TYPE", "JSON content type required", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("INVALID_JSON", "JSON body required", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new DomainError(
        "BODY_TOO_LARGE",
        "Maximum JSON size is 64 KiB",
        413,
      );
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("INVALID_JSON", "Malformed JSON", 400);
  }
}
export function json(value: unknown, status = 200) {
  return new Response(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}
export async function handle(
  request: Request,
  work: () => Promise<unknown>,
  status = 200,
) {
  try {
    authorize(request);
    return json(await work(), status);
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: "VALIDATION",
          issues: error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        400,
      );
    if (error instanceof RangeError)
      return json({ error: "INVALID_QUANTITY", message: error.message }, 400);
    if (error instanceof DomainError)
      return json({ error: error.code, message: error.message }, error.status);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return json({ error: "NOT_FOUND" }, 404);
      if (["P2002", "P2003", "P2004", "P2010", "P2034"].includes(error.code))
        return json(
          {
            error: "CONSTRAINT_CONFLICT",
            message:
              "Request conflicts with stored data or database constraints",
          },
          409,
        );
    }
    if (
      error instanceof Prisma.PrismaClientUnknownRequestError &&
      /23P01|23514|exclusion constraint/.test(error.message)
    )
      return json(
        {
          error: "CONSTRAINT_CONFLICT",
          message: "Request conflicts with stored data or database constraints",
        },
        409,
      );
    return json(
      {
        error: "INTERNAL_ERROR",
        message: "The request could not be completed",
      },
      500,
    );
  }
}

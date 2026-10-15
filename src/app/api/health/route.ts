import { getDb } from "@/server/db/client";
import { handle, page, readBody } from "@/server/http/responses";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET(request: Request) {
  return handle(request, async () => {
    await getDb().$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected", mode: "foundation" };
  });
}

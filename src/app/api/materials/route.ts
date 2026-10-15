import { getDb } from "@/server/db/client";
import { handle, page, readBody } from "@/server/http/responses";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { createMaterial } from "@/server/repositories/materialRepository";
export function GET(request: Request) {
  return handle(request, async () => {
    const { limit, offset } = page(request);
    return getDb().material.findMany({
      take: limit,
      skip: offset,
      orderBy: { id: "asc" },
    });
  });
}
export function POST(request: Request) {
  return handle(
    request,
    async () => createMaterial(getDb(), await readBody(request)),
    201,
  );
}

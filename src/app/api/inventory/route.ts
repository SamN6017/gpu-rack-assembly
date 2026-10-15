import { getDb } from "@/server/db/client";
import { handle, page, readBody } from "@/server/http/responses";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export function GET(request: Request) {
  return handle(request, async () => {
    const { limit, offset } = page(request);
    return getDb().inventoryBalance.findMany({
      take: limit,
      skip: offset,
      orderBy: { id: "asc" },
      include: { material: true, location: true },
    });
  });
}

import { getDb } from "@/server/db/client";
import { handle, readBody, page } from "@/server/http/responses";
import { proposeAssumption } from "@/server/services/assumptionService";
export function GET(request: Request) {
  return handle(request, async () => {
    const { limit, offset } = page(request);
    return getDb().dataAssumption.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
  });
}
export function POST(request: Request) {
  return handle(
    request,
    async () => proposeAssumption(getDb(), await readBody(request)),
    201,
  );
}

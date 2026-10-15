import { getDb } from "@/server/db/client";
import { handle, page, readBody } from "@/server/http/responses";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { rackModelSchema } from "@/domain/manufacturing/schemas";
export function GET(request: Request) {
  return handle(request, async () => {
    const { limit, offset } = page(request);
    return getDb().rackModel.findMany({
      take: limit,
      skip: offset,
      orderBy: { id: "asc" },
    });
  });
}
export function POST(request: Request) {
  return handle(
    request,
    async () =>
      getDb().rackModel.create({
        data: rackModelSchema.parse(await readBody(request)),
      }),
    201,
  );
}

import { z } from "zod";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http/responses";
import { getRunSnapshots } from "@/server/repositories/simulationRepository";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  c: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const id = z.string().uuid().parse((await c.params).id);
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(500).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return getRunSnapshots(getDb(), id, query);
  });
}

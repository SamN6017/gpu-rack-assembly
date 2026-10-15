import { z } from "zod";
import { getDb } from "@/server/db/client";
import { handle } from "@/server/http/responses";
import { getScenario } from "@/server/services/scenarioService";

export const dynamic = "force-dynamic";

export function GET(
  request: Request,
  c: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const id = z.string().uuid().parse((await c.params).id);
    return getScenario(getDb(), id);
  });
}

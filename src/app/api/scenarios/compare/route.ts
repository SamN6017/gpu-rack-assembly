import { z } from "zod";
import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http/responses";
import { compareScenarios } from "@/server/services/scenarioService";

export const dynamic = "force-dynamic";

const compareSchema = z
  .object({
    runIds: z.array(z.string().uuid()).min(2).max(4),
  })
  .strict();

export function POST(request: Request) {
  return handle(request, async () => {
    const body = compareSchema.parse(await readBody(request));
    return compareScenarios(getDb(), body.runIds);
  });
}

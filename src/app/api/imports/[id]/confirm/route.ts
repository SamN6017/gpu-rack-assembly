import { z } from "zod";
import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http/responses";
import { confirmImport } from "@/server/services/importService";
import { idSchema } from "@/domain/manufacturing/schemas";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const body = z
      .object({
        hash: z.string().length(64),
        actor: z.string().trim().min(1).max(200),
      })
      .strict()
      .parse(await readBody(request));
    return confirmImport(
      getDb(),
      idSchema.parse((await context.params).id),
      body.hash,
      body.actor,
    );
  });
}

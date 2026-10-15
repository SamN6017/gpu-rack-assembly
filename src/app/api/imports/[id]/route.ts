import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http/responses";
import { previewImport } from "@/server/services/importService";
import { idSchema } from "@/domain/manufacturing/schemas";
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(request, async () =>
    previewImport(
      getDb(),
      idSchema.parse((await context.params).id),
      await readBody(request),
    ),
  );
}

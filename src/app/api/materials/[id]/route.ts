import { getDb } from "@/server/db/client";
import { handle, page, readBody } from "@/server/http/responses";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { replaceMaterial } from "@/server/repositories/materialRepository";
import { idSchema } from "@/domain/manufacturing/schemas";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handle(request, () =>
    getDb().material.findUniqueOrThrow({ where: { id: idSchema.parse(id) } }),
  );
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handle(request, async () =>
    replaceMaterial(getDb(), id, await readBody(request)),
  );
}

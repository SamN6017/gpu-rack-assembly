import { getDb } from "@/server/db/client";
import { handle, readBody } from "@/server/http/responses";
import { getBomById, updateBomWorkstationMapping } from "@/server/repositories/bomRepository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const { id } = await params;
    return getBomById(getDb(), id);
  });
}

export function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const { id } = await params;
    const body = (await readBody(request)) as {
      workstationId?: string;
      quantityPerRack?: string;
      effectiveTo?: string | null;
      sourceReference?: string;
    };
    return updateBomWorkstationMapping(getDb(), id, body);
  });
}

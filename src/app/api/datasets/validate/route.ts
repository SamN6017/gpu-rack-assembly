import { handle, readBody } from "@/server/http/responses";
import { validateDemonstrationDataset } from "@/domain/manufacturing/kanbanValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request: Request) {
  return handle(
    request,
    async () => {
      const body = await readBody(request);
      return validateDemonstrationDataset(body as {
        materials?: Array<Record<string, unknown>>;
        workstations?: Array<Record<string, unknown>>;
        boms?: Array<Record<string, unknown>>;
        inventory?: Array<Record<string, unknown>>;
        kanbanRules?: Array<Record<string, unknown>>;
      });
    },
    200,
  );
}

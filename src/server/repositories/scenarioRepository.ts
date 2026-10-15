import "server-only";
import { PrismaClient } from "@prisma/client";
import { idSchema } from "@/domain/manufacturing/schemas";
// Phase 1 exposes stored configurations only. Validated scenario creation and
// immutable run snapshots are introduced with the actual engine input contract.
export function findScenario(db: PrismaClient, id: string) {
  return db.simulationScenario.findUnique({
    where: { id: idSchema.parse(id) },
    include: { runs: { take: 20, orderBy: { createdAt: "desc" } } },
  });
}

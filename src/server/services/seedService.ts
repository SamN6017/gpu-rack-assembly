import "server-only";
import { PrismaClient } from "@prisma/client";
import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";
export async function seedFoundation(db: PrismaClient) {
  return db.$transaction(async (tx) => {
    for (const station of workstationDefaults) {
      // Never overwrite a user's configured cycle time/name on a repeated seed.
      const stored = await tx.workstation.upsert({
        where: { stationCode: station.stationCode },
        create: { ...station, cycleTimeSeconds: 720 },
        update: {},
      });
      const provenanceId = `00000000-0000-4000-9000-${String(station.sequence).padStart(12, "0")}`;
      // Stable provenance ID; the application default is an assumption, not factory evidence.
      if (
        !(await tx.dataProvenance.findUnique({ where: { id: provenanceId } }))
      )
        await tx.dataProvenance.create({
          data: {
            id: provenanceId,
            entityType: "Workstation",
            entityId: stored.id,
            fieldName: "initialDefinition",
            classification: "ASSUMED",
            datasetKind: "SYNTHETIC",
            sourceReference:
              "repository:e389bb8:src/simulation/simulationEngine.ts",
            rawValue: {
              stationCode: station.stationCode,
              name: station.name,
              sequence: station.sequence,
              cycleTimeSeconds: 720,
            },
          },
        });
    }
    return tx.workstation.count();
  });
}

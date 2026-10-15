import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { simulationConfigSchema } from "@/simulation/core/types";
import { addMonths } from "@/simulation/core/calendar";
import { ENGINE_VERSION } from "@/simulation/core/engine";
import { contentHash } from "./contentHash";
import { DomainError } from "./transaction";
export async function saveScenario(db: PrismaClient, input: unknown) {
  const config = simulationConfigSchema.parse(input);
  const start = Date.parse(config.startDate),
    end = addMonths(start, config.durationMonths);
  return db.simulationScenario.create({
    data: {
      name: config.name,
      description: config.assumptions.join("\n"),
      startDate: new Date(start),
      durationDays: Math.ceil((end - start) / 86400000),
      durationMonths: config.durationMonths,
      calendarTimezone: config.timezone,
      productionScheduleJson: config as unknown as Prisma.InputJsonValue,
      initialInventoryJson: config.materials,
      kanbanOverridesJson: {},
      simulationSeed: config.seed,
      schemaVersion: "1",
      datasetKind: config.datasetKind,
    },
  });
}
export async function enqueueRun(db: PrismaClient, scenarioId: string) {
  const scenario = await db.simulationScenario.findUniqueOrThrow({
    where: { id: scenarioId },
  });
  const config = simulationConfigSchema.parse(scenario.productionScheduleJson);
  return db.simulationRun.create({
    data: {
      scenarioId,
      status: "QUEUED",
      simulatedStart: new Date(config.startDate),
      simulatedEnd: new Date(
        addMonths(Date.parse(config.startDate), config.durationMonths),
      ),
      inputSnapshotJson: config as unknown as Prisma.InputJsonValue,
      configurationVersion: "1",
      engineVersion: ENGINE_VERSION,
      simulationSeed: config.seed,
      inputHash: contentHash(config),
    },
  });
}
export async function controlRun(
  db: PrismaClient,
  id: string,
  action: "pause" | "resume" | "cancel",
) {
  const allowed =
    action === "resume" ? ["PAUSED"] : ["QUEUED", "RUNNING", "PAUSED"];
  const status =
    action === "pause"
      ? "PAUSED"
      : action === "resume"
        ? "QUEUED"
        : "CANCELLED";
  const changed = await db.simulationRun.updateMany({
    where: {
      id,
      status: { in: allowed as ("PAUSED" | "QUEUED" | "RUNNING")[] },
    },
    data: { status },
  });
  if (!changed.count)
    throw new DomainError("RUN_STATE", "This run cannot accept that action");
  return db.simulationRun.findUniqueOrThrow({ where: { id } });
}

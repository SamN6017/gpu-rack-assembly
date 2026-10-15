import "server-only";
import { runAnalytics } from "@/analytics/runAnalytics";
import { Prisma, PrismaClient } from "@prisma/client";
import { ManufacturingEngine } from "@/simulation/core/engine";
export async function processNextRun(db: PrismaClient) {
  // A stale worker has no authority to publish after its lease is replaced.
  const candidate = await db.simulationRun.findFirst({
    where: {
      OR: [
        { status: "QUEUED" },
        { status: "RUNNING", updatedAt: { lt: new Date(Date.now() - 300000) } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return false;
  const lease = new Date();
  const claim = await db.simulationRun.updateMany({
    where: {
      id: candidate.id,
      status: candidate.status,
      updatedAt: candidate.updatedAt,
    },
    data: { status: "RUNNING", startedAt: lease },
  });
  if (!claim.count) return true;
  try {
    const engine = new ManufacturingEngine(candidate.inputSnapshotJson);
    let count = 0;
    const begin = performance.now();
    while (!engine.complete) {
      engine.stepEvent();
      if (++count % 1000 === 0) {
        const heartbeat = await db.simulationRun.updateMany({
          where: { id: candidate.id, status: "RUNNING", startedAt: lease },
          data: { updatedAt: new Date() },
        });
        if (!heartbeat.count) return true;
      }
    }
    const result = engine.result();
    result.elapsedMs = Math.round(performance.now() - begin);
    await db.$transaction(
      async (tx) => {
        const stillOwned = await tx.simulationRun.updateMany({
          where: { id: candidate.id, status: "RUNNING", startedAt: lease },
          data: {
            status: "COMPLETED",
            finishedAt: new Date(),
            summaryJson: {
              analytics: runAnalytics(result),
              final: result.final,
              snapshots: result.snapshots,
              elapsedMs: result.elapsedMs,
              eventCount: result.events.length,
            } as unknown as Prisma.InputJsonValue,
          },
        });
        if (!stillOwned.count) return;
        for (let offset = 0; offset < result.events.length; offset += 1000)
          await tx.simulationEvent.createMany({
            data: result.events
              .slice(offset, offset + 1000)
              .map((e) => ({
                runId: candidate.id,
                sequenceNumber: BigInt(e.sequence),
                virtualTimestamp: new Date(e.time),
                eventType: e.type,
                rackId: e.rackId,
                payloadJson: e,
              })),
          });
      },
      { timeout: 120000 },
    );
  } catch (error) {
    await db.simulationRun.updateMany({
      where: { id: candidate.id, status: "RUNNING", startedAt: lease },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        summaryJson: {
          error: error instanceof Error ? error.message : "Worker failed",
        },
      },
    });
  }
  return true;
}

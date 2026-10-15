import "server-only";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export async function listRuns(
  db: PrismaClient,
  opts: { limit: number; offset: number },
) {
  return db.simulationRun.findMany({
    take: opts.limit,
    skip: opts.offset,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      simulatedStart: true,
      simulatedEnd: true,
      inputHash: true,
      engineVersion: true,
      scenario: { select: { name: true, datasetKind: true } },
    },
  });
}

export async function getRun(db: PrismaClient, id: string) {
  return db.simulationRun.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(id) },
    include: { scenario: { select: { name: true, datasetKind: true } } },
  });
}

export async function listRunEvents(
  db: PrismaClient,
  runId: string,
  opts: { after: number; limit: number },
) {
  return db.simulationEvent.findMany({
    where: {
      runId: z.string().uuid().parse(runId),
      sequenceNumber: { gt: opts.after },
    },
    take: opts.limit,
    orderBy: { sequenceNumber: "asc" },
  });
}

export async function getRunSnapshots(
  db: PrismaClient,
  runId: string,
  opts: { limit: number; offset: number },
) {
  const run = await db.simulationRun.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(runId) },
    select: { id: true, status: true, summaryJson: true },
  });
  // Snapshots are embedded in summaryJson during this phase;
  // they are bounded by limit/offset here for future migration readiness.
  const summary = run.summaryJson as {
    snapshots?: unknown[];
    [key: string]: unknown;
  } | null;
  const snapshots = summary?.snapshots ?? [];
  return {
    runId: run.id,
    status: run.status,
    total: snapshots.length,
    offset: opts.offset,
    limit: opts.limit,
    snapshots: snapshots.slice(opts.offset, opts.offset + opts.limit),
  };
}

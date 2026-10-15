import "server-only";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";

export interface AnalyticsQueryOutput {
  runId: string;
  status: string;
  scenarioName: string;
  datasetKind: string;
  engineVersion: string;
  simulationSeed: number;
  simulatedStart: string;
  simulatedEnd: string;
  elapsedMs: number;
  eventCount: number;
  analytics: RunAnalytics;
  snapshots: Array<{
    time: number;
    date: string;
    completed: number;
    queued: number;
    waiting: number;
    stocks: Array<{
      id: string;
      onHand: number;
      warehouse: number;
      inTransit: number;
    }>;
  }>;
}

export async function getRunAnalytics(
  db: PrismaClient,
  runId: string,
): Promise<AnalyticsQueryOutput> {
  const run = await db.simulationRun.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(runId) },
    include: { scenario: { select: { name: true, datasetKind: true } } },
  });

  const summary = run.summaryJson as {
    analytics?: RunAnalytics;
    snapshots?: Snapshot[];
    final?: Snapshot;
    elapsedMs?: number;
    eventCount?: number;
    error?: string;
  } | null;

  if (!summary?.analytics) {
    throw new Error("Analytics are not available for this run (run may still be queued or running)");
  }

  const snapshots = (summary.snapshots || []).map((s) => ({
    time: s.time,
    date: new Date(s.time).toISOString().slice(0, 10),
    completed: s.completed,
    queued: s.queued,
    waiting: s.waiting,
    stocks: s.stocks.map((st) => ({
      id: st.id,
      onHand: st.onHand,
      warehouse: st.warehouse,
      inTransit: st.inTransit,
    })),
  }));

  return {
    runId: run.id,
    status: run.status,
    scenarioName: run.scenario.name,
    datasetKind: run.scenario.datasetKind,
    engineVersion: run.engineVersion,
    simulationSeed: run.simulationSeed,
    simulatedStart: run.simulatedStart.toISOString(),
    simulatedEnd: run.simulatedEnd.toISOString(),
    elapsedMs: summary.elapsedMs || 0,
    eventCount: summary.eventCount || 0,
    analytics: summary.analytics,
    snapshots,
  };
}

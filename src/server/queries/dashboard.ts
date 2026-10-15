import "server-only";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";

export interface DashboardQueryOutput {
  runId: string;
  status: string;
  scenarioName: string;
  datasetKind: string;
  simulatedPeriod: {
    start: string;
    end: string;
    durationDays: number;
  };
  kpis: {
    completedRacks: number;
    wipRacks: number;
    queuedRacks: number;
    waitingForMaterial: number;
    throughputPerWorkingHour: number;
    averageCycleMinutes: number;
    stockoutCount: number;
    replenishmentCount: number;
    downtimeHours: number;
    scheduledWorkingHours: number;
    bottleneckStation: string | null;
  };
  stations: Array<{
    stationNumber: number;
    stationName: string;
    utilizationPercent: number;
    busyHours: number;
    blockedHours: number;
    shortageHours: number;
    equipmentHours: number;
  }>;
}

export async function getRunDashboard(
  db: PrismaClient,
  runId: string,
): Promise<DashboardQueryOutput> {
  const run = await db.simulationRun.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(runId) },
    include: { scenario: { select: { name: true, datasetKind: true } } },
  });

  const config = run.inputSnapshotJson as unknown as SimulationConfig;
  const summary = run.summaryJson as {
    analytics?: RunAnalytics;
    final?: Snapshot;
  } | null;

  if (!summary?.analytics) {
    throw new Error("Dashboard summary is not available for this run");
  }

  const a = summary.analytics;
  const durationDays = Math.ceil(
    (run.simulatedEnd.getTime() - run.simulatedStart.getTime()) / 86400000,
  );

  // Identify bottleneck station (station with highest blocked/shortage downtime or lowest throughput)
  const stationNames = [
    "Frame preparation",
    "Rail mounting",
    "Electrical installation",
    "Cable routing",
    "Final assembly",
  ];

  let bottleneckStation: string | null = null;
  let maxDowntime = 0;
  for (const s of a.stations) {
    const dt = s.blockedSeconds + s.shortageSeconds;
    if (dt > maxDowntime) {
      maxDowntime = dt;
      bottleneckStation = `STATION-${s.station}`;
    }
  }

  const stations = a.stations.map((s) => ({
    stationNumber: s.station,
    stationName: stationNames[s.station - 1] || `Station ${s.station}`,
    utilizationPercent: Number((s.utilization * 100).toFixed(1)),
    busyHours: Number((s.busySeconds / 3600).toFixed(2)),
    blockedHours: Number((s.blockedSeconds / 3600).toFixed(2)),
    shortageHours: Number((s.shortageSeconds / 3600).toFixed(2)),
    equipmentHours: Number((s.equipmentSeconds / 3600).toFixed(2)),
  }));

  return {
    runId: run.id,
    status: run.status,
    scenarioName: run.scenario.name,
    datasetKind: run.scenario.datasetKind,
    simulatedPeriod: {
      start: run.simulatedStart.toISOString(),
      end: run.simulatedEnd.toISOString(),
      durationDays,
    },
    kpis: {
      completedRacks: a.completed,
      wipRacks: a.wip,
      queuedRacks: a.queued,
      waitingForMaterial: a.waiting,
      throughputPerWorkingHour: Number(a.throughputPerWorkingHour.toFixed(2)),
      averageCycleMinutes: Number(a.averageCycleMinutes.toFixed(1)),
      stockoutCount: a.stockoutCount,
      replenishmentCount: a.replenishmentCount,
      downtimeHours: Number((a.downtimeSeconds / 3600).toFixed(2)),
      scheduledWorkingHours: Number((a.scheduledSeconds / 3600).toFixed(2)),
      bottleneckStation,
    },
    stations,
  };
}

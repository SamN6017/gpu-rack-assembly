import "server-only";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";
import type { RunAnalytics } from "@/analytics/runAnalytics";
import { DomainError } from "./transaction";

export interface ScenarioComparisonItem {
  runId: string;
  scenarioId: string;
  name: string;
  datasetKind: string;
  isBaseline: boolean;
  engineVersion: string;
  simulationSeed: number;
  config: SimulationConfig;
  kpis: {
    completedRacks: number;
    throughputPerWorkingHour: number;
    stockoutCount: number;
    downtimeSeconds: number;
    replenishmentCount: number;
    averageCycleMinutes: number;
    scheduledWorkingSeconds: number;
  };
  deltas?: {
    completedRacks: number;
    throughputPerWorkingHour: number;
    stockoutCount: number;
    downtimeSeconds: number;
    replenishmentCount: number;
    averageCycleMinutes: number;
  };
  configOverrides?: Record<string, { baseline: unknown; override: unknown }>;
}

export interface ScenarioComparisonResult {
  baselineName: string;
  baselineRunId: string;
  runs: ScenarioComparisonItem[];
}

export async function getScenario(db: PrismaClient, id: string) {
  return db.simulationScenario.findUniqueOrThrow({
    where: { id: z.string().uuid().parse(id) },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          simulatedStart: true,
          simulatedEnd: true,
          simulationSeed: true,
        },
      },
    },
  });
}

export async function compareScenarios(
  db: PrismaClient,
  runIds: string[],
): Promise<ScenarioComparisonResult> {
  if (runIds.length < 2 || runIds.length > 4) {
    throw new DomainError(
      "INVALID_RUN_COUNT",
      "Scenario comparison requires between 2 and 4 runs",
      400,
    );
  }

  const validIds = runIds.map((id) => z.string().uuid().parse(id));
  const runs = await db.simulationRun.findMany({
    where: { id: { in: validIds } },
    include: { scenario: { select: { id: true, name: true, datasetKind: true } } },
  });

  if (runs.length !== validIds.length) {
    throw new DomainError(
      "RUNS_NOT_FOUND",
      "One or more specified runs could not be found",
      404,
    );
  }

  // Preserve ordering matching runIds (first run is baseline)
  const orderedRuns = validIds.map((id) => runs.find((r) => r.id === id)!);

  for (const r of orderedRuns) {
    if (r.status !== "COMPLETED") {
      throw new DomainError(
        "RUN_NOT_COMPLETED",
        `Run ${r.id} (${r.scenario.name}) is ${r.status}. Only COMPLETED runs can be compared.`,
        400,
      );
    }
  }

  const baselineRun = orderedRuns[0];
  const baselineConfig = baselineRun.inputSnapshotJson as unknown as SimulationConfig;
  const baselineSummary = baselineRun.summaryJson as {
    analytics: RunAnalytics;
    final: Snapshot;
  };
  const bA = baselineSummary.analytics;

  const baselineItem: ScenarioComparisonItem = {
    runId: baselineRun.id,
    scenarioId: baselineRun.scenario.id,
    name: baselineRun.scenario.name,
    datasetKind: baselineRun.scenario.datasetKind,
    isBaseline: true,
    engineVersion: baselineRun.engineVersion,
    simulationSeed: baselineRun.simulationSeed,
    config: baselineConfig,
    kpis: {
      completedRacks: bA.completed,
      throughputPerWorkingHour: Number(bA.throughputPerWorkingHour.toFixed(2)),
      stockoutCount: bA.stockoutCount,
      downtimeSeconds: Number(bA.downtimeSeconds.toFixed(1)),
      replenishmentCount: bA.replenishmentCount,
      averageCycleMinutes: Number(bA.averageCycleMinutes.toFixed(1)),
      scheduledWorkingSeconds: bA.scheduledSeconds,
    },
  };

  const comparedRuns: ScenarioComparisonItem[] = [baselineItem];

  for (let i = 1; i < orderedRuns.length; i++) {
    const curRun = orderedRuns[i];
    const curConfig = curRun.inputSnapshotJson as unknown as SimulationConfig;
    const curSummary = curRun.summaryJson as {
      analytics: RunAnalytics;
      final: Snapshot;
    };
    const cA = curSummary.analytics;

    // Calculate deltas against baseline
    const deltas = {
      completedRacks: cA.completed - bA.completed,
      throughputPerWorkingHour: Number(
        (cA.throughputPerWorkingHour - bA.throughputPerWorkingHour).toFixed(2),
      ),
      stockoutCount: cA.stockoutCount - bA.stockoutCount,
      downtimeSeconds: Number((cA.downtimeSeconds - bA.downtimeSeconds).toFixed(1)),
      replenishmentCount: cA.replenishmentCount - bA.replenishmentCount,
      averageCycleMinutes: Number(
        (cA.averageCycleMinutes - bA.averageCycleMinutes).toFixed(1),
      ),
    };

    // Extract configuration overrides vs baseline
    const configOverrides: Record<string, { baseline: unknown; override: unknown }> =
      {};

    const keysToCompare: (keyof SimulationConfig)[] = [
      "dailyDemand",
      "durationMonths",
      "shiftHours",
      "handlers",
      "seed",
      "cycleSeconds",
    ];

    for (const key of keysToCompare) {
      if (JSON.stringify(curConfig[key]) !== JSON.stringify(baselineConfig[key])) {
        configOverrides[key] = {
          baseline: baselineConfig[key],
          override: curConfig[key],
        };
      }
    }

    // Compare material-level settings (lead time, warehouse, point-of-use, bin capacity)
    for (const curMat of curConfig.materials) {
      const baseMat = baselineConfig.materials.find((m) => m.id === curMat.id);
      if (baseMat) {
        if (curMat.leadMinutes !== baseMat.leadMinutes) {
          configOverrides[`${curMat.partNumber}.leadMinutes`] = {
            baseline: baseMat.leadMinutes,
            override: curMat.leadMinutes,
          };
        }
        if (curMat.warehouse !== baseMat.warehouse) {
          configOverrides[`${curMat.partNumber}.warehouse`] = {
            baseline: baseMat.warehouse,
            override: curMat.warehouse,
          };
        }
        if (curMat.pointOfUse !== baseMat.pointOfUse) {
          configOverrides[`${curMat.partNumber}.pointOfUse`] = {
            baseline: baseMat.pointOfUse,
            override: curMat.pointOfUse,
          };
        }
        if (curMat.binCapacity !== baseMat.binCapacity) {
          configOverrides[`${curMat.partNumber}.binCapacity`] = {
            baseline: baseMat.binCapacity,
            override: curMat.binCapacity,
          };
        }
      }
    }

    comparedRuns.push({
      runId: curRun.id,
      scenarioId: curRun.scenario.id,
      name: curRun.scenario.name,
      datasetKind: curRun.scenario.datasetKind,
      isBaseline: false,
      engineVersion: curRun.engineVersion,
      simulationSeed: curRun.simulationSeed,
      config: curConfig,
      kpis: {
        completedRacks: cA.completed,
        throughputPerWorkingHour: Number(cA.throughputPerWorkingHour.toFixed(2)),
        stockoutCount: cA.stockoutCount,
        downtimeSeconds: Number(cA.downtimeSeconds.toFixed(1)),
        replenishmentCount: cA.replenishmentCount,
        averageCycleMinutes: Number(cA.averageCycleMinutes.toFixed(1)),
        scheduledWorkingSeconds: cA.scheduledSeconds,
      },
      deltas,
      configOverrides,
    });
  }

  return {
    baselineName: baselineRun.scenario.name,
    baselineRunId: baselineRun.id,
    runs: comparedRuns,
  };
}

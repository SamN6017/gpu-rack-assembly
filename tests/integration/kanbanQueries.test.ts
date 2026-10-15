import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { saveScenario, enqueueRun } from "@/server/services/simulationService";
import { processNextRun } from "@/server/workers/simulationWorker";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import {
  calculateInventoryPosition,
  evaluateBinStates,
  calculateCoverageWorkingDays,
} from "@/simulation/core/kanban";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

it("queries Kanban replenishment state and verifies stock conservation and bin evaluation", async () => {
  const config = demoConfig();
  config.durationMonths = 1;
  config.dailyDemand = 5;

  const scenario = await saveScenario(db, config);
  const run = await enqueueRun(db, scenario.id);

  // Run the simulation worker to process the run to completion
  await processNextRun(db);

  const completedRun = await db.simulationRun.findUniqueOrThrow({
    where: { id: run.id },
  });
  expect(completedRun.status).toBe("COMPLETED");

  const summary = completedRun.summaryJson as {
    final: Snapshot;
    analytics: any;
  };
  expect(summary).toBeDefined();
  expect(summary.final).toBeDefined();

  const final = summary.final;
  const cfg = completedRun.inputSnapshotJson as unknown as SimulationConfig;

  // Verify Kanban material balances and calculations
  for (const m of cfg.materials) {
    const stock = final.stocks.find((s) => s.id === m.id)!;
    expect(stock).toBeDefined();

    // 1. Net inventory position
    const position = calculateInventoryPosition(stock);
    expect(position).toBe(stock.onHand + stock.onOrder - stock.reserved);

    // 2. Point-of-use bins
    const bins = evaluateBinStates(
      stock.onHand,
      m.bins,
      m.binCapacity,
      stock.onOrder,
    );
    expect(bins.length).toBe(m.bins);
    for (const b of bins) {
      expect(b.capacity).toBe(m.binCapacity);
      expect(b.quantity).toBeGreaterThanOrEqual(0);
      expect(b.quantity).toBeLessThanOrEqual(m.binCapacity);
      expect(["FULL", "ACTIVE", "REPLENISHING", "EMPTY"]).toContain(b.status);
    }

    // 3. Stock conservation: warehouse + onHand + inTransit + consumed = initial opening
    const opening = m.warehouse + m.pointOfUse;
    const current =
      stock.warehouse + stock.onHand + stock.inTransit + stock.consumed;
    expect(current).toBeCloseTo(opening, 5);

    // 4. Coverage in working days
    const coverage = calculateCoverageWorkingDays(
      stock.onHand,
      cfg.dailyDemand,
      m.quantity,
    );
    expect(coverage).toBeDefined();
    if (coverage !== null) {
      expect(coverage).toBeGreaterThanOrEqual(0);
    }
  }

  // 5. Verify replenishment events were recorded in SimulationEvent table
  const replEvents = await db.simulationEvent.count({
    where: {
      runId: run.id,
      eventType: {
        in: [
          "REPLENISHMENT_REQUESTED",
          "REPLENISHMENT_PICKED",
          "REPLENISHMENT_DELIVERED",
        ],
      },
    },
  });
  expect(replEvents).toBeGreaterThan(0);
});

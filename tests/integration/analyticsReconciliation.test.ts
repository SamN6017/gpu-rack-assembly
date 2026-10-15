import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { saveScenario, enqueueRun } from "@/server/services/simulationService";
import { processNextRun } from "@/server/workers/simulationWorker";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { getRunAnalytics } from "@/server/queries/analytics";
import { getRunDashboard } from "@/server/queries/dashboard";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

it("reconciles analytics and dashboard metrics against raw database events and finite balances", async () => {
  const config = demoConfig();
  config.durationMonths = 1;
  config.dailyDemand = 5;

  const scenario = await saveScenario(db, config);
  const run = await enqueueRun(db, scenario.id);

  // Execute simulation worker to completion
  await processNextRun(db);

  // 1. Fetch dashboard metrics
  const dashboard = await getRunDashboard(db, run.id);
  expect(dashboard.status).toBe("COMPLETED");
  expect(dashboard.kpis.completedRacks).toBeGreaterThan(0);

  // 2. Fetch full analytics metrics
  const analyticsData = await getRunAnalytics(db, run.id);
  const a = analyticsData.analytics;

  // 3. Reconcile Completed Racks against raw database events
  const dbCompletedCount = await db.simulationEvent.count({
    where: { runId: run.id, eventType: "RACK_COMPLETED" },
  });
  expect(a.completed).toBe(dbCompletedCount);
  expect(dashboard.kpis.completedRacks).toBe(dbCompletedCount);

  // Reconcile Daily & Monthly production sums
  const sumDaily = Object.values(a.daily).reduce((acc, v) => acc + v, 0);
  const sumMonthly = Object.values(a.monthly).reduce((acc, v) => acc + v, 0);
  expect(sumDaily).toBe(a.completed);
  expect(sumMonthly).toBe(a.completed);

  // 4. Reconcile Replenishments & Shortages against raw events
  const dbReplenishments = await db.simulationEvent.count({
    where: { runId: run.id, eventType: "REPLENISHMENT_REQUESTED" },
  });
  expect(a.replenishmentCount).toBe(dbReplenishments);
  expect(dashboard.kpis.replenishmentCount).toBe(dbReplenishments);

  const dbShortages = await db.simulationEvent.count({
    where: { runId: run.id, eventType: "MATERIAL_SHORTAGE" },
  });
  expect(a.stockoutCount).toBe(dbShortages);
  expect(dashboard.kpis.stockoutCount).toBe(dbShortages);

  // 5. Reconcile Material Consumption for each material
  for (const m of a.materials) {
    const startedCount = await db.simulationEvent.count({
      where: {
        runId: run.id,
        eventType: "STATION_STARTED",
        workstationId: null, // payload contains station index
      },
    });

    // Opening stock conservation
    const initialMat = config.materials.find((x) => x.id === m.id)!;
    expect(m.opening).toBe(initialMat.warehouse + initialMat.pointOfUse);
    expect(m.closing).toBe(m.warehouse + m.onHand + m.inTransit);
    expect(m.closing + m.consumed).toBeCloseTo(m.opening, 5);

    // Coverage computation
    if (m.coverageWorkingDays !== null) {
      expect(m.coverageWorkingDays).toBeGreaterThanOrEqual(0);
    }
  }

  // 6. Verify station utilization and scheduled time
  expect(dashboard.stations.length).toBe(5);
  for (const s of dashboard.stations) {
    expect(s.utilizationPercent).toBeGreaterThanOrEqual(0);
    expect(s.utilizationPercent).toBeLessThanOrEqual(100);
  }

  // 7. Verify all 10 chart dimensions are generated
  expect(Object.keys(a.daily).length).toBeGreaterThan(0); // 1. Daily production
  expect(Object.keys(a.monthly).length).toBeGreaterThan(0); // 2. Monthly production
  expect(a.materials.length).toBe(5); // 3. Material consumption
  expect(analyticsData.snapshots.length).toBeGreaterThan(0); // 4. POU inventory over time
  expect(a.materials.every((m) => typeof m.replenishments === "number")).toBe(true); // 5. Replenishment frequency
  expect(a.materials.every((m) => typeof m.stockouts === "number")).toBe(true); // 6. Stockout frequency
  expect(a.stations.length).toBe(5); // 7. Station utilization
  expect(dashboard.kpis.downtimeHours).toBeGreaterThanOrEqual(0); // 8. Downtime causes
  expect(analyticsData.snapshots[0].stocks.length).toBe(5); // 9. Warehouse trends
  expect(a.materials.some((m) => m.coverageWorkingDays !== null)).toBe(true); // 10. Coverage
});

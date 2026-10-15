import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { saveScenario, enqueueRun } from "@/server/services/simulationService";
import { processNextRun } from "@/server/workers/simulationWorker";
import { demoConfig, applyPreset } from "@/domain/manufacturing/scenarioPresets";
import {
  compareScenarios,
  getScenario,
} from "@/server/services/scenarioService";
import { DomainError } from "@/server/services/transaction";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

describe("Scenario Service & Comparison Integration", () => {
  it("retrieves a scenario with its recent runs via getScenario", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;

    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id);

    const retrieved = await getScenario(db, scenario.id);
    expect(retrieved.id).toBe(scenario.id);
    expect(retrieved.name).toBe(config.name);
    expect(retrieved.runs.length).toBe(1);
    expect(retrieved.runs[0].id).toBe(run.id);
    expect(retrieved.runs[0].status).toBe("QUEUED");
  });

  it("compares completed baseline and overridden scenario runs with deltas and config differences", async () => {
    // 1. Create and complete Baseline Run
    const baseConfig = demoConfig();
    baseConfig.durationMonths = 1;
    baseConfig.dailyDemand = 2;
    const baseScenario = await saveScenario(db, baseConfig);
    const baseRun = await enqueueRun(db, baseScenario.id);
    await processNextRun(db);

    // 2. Create and complete Overridden Run (Increased Demand)
    const overConfig = applyPreset(baseConfig, "Increased demand");
    overConfig.dailyDemand = 4;
    const overScenario = await saveScenario(db, overConfig);
    const overRun = await enqueueRun(db, overScenario.id);
    await processNextRun(db);

    // 3. Compare Scenarios
    const comparison = await compareScenarios(db, [baseRun.id, overRun.id]);

    expect(comparison.baselineRunId).toBe(baseRun.id);
    expect(comparison.baselineName).toBe(baseConfig.name);
    expect(comparison.runs).toHaveLength(2);

    const [bItem, cItem] = comparison.runs;

    // Baseline item assertions
    expect(bItem.isBaseline).toBe(true);
    expect(bItem.deltas).toBeUndefined();
    expect(bItem.kpis.completedRacks).toBeGreaterThan(0);

    // Compared item assertions
    expect(cItem.isBaseline).toBe(false);
    expect(cItem.deltas).toBeDefined();
    expect(cItem.deltas?.completedRacks).toBe(
      cItem.kpis.completedRacks - bItem.kpis.completedRacks,
    );
    expect(cItem.deltas?.stockoutCount).toBe(
      cItem.kpis.stockoutCount - bItem.kpis.stockoutCount,
    );

    // Config overrides assertion
    expect(cItem.configOverrides).toBeDefined();
    expect(cItem.configOverrides?.dailyDemand).toEqual({
      baseline: 2,
      override: 4,
    });
  });

  it("rejects comparison when run count is invalid (< 2 or > 4)", async () => {
    await expect(compareScenarios(db, ["00000000-0000-0000-0000-000000000001"])).rejects.toThrow(
      DomainError,
    );
  });

  it("rejects comparison when one of the runs is not found", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id);
    await processNextRun(db);

    await expect(
      compareScenarios(db, [
        run.id,
        "00000000-0000-0000-0000-000000000999",
      ]),
    ).rejects.toThrow("One or more specified runs could not be found");
  });

  it("rejects comparison if any run is not COMPLETED", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run1 = await enqueueRun(db, scenario.id);
    await processNextRun(db);

    const run2 = await enqueueRun(db, scenario.id); // Still QUEUED

    await expect(compareScenarios(db, [run1.id, run2.id])).rejects.toThrow(
      "Only COMPLETED runs can be compared",
    );
  });
});

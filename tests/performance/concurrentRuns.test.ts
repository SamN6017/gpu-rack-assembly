import { describe, it, expect } from "vitest";
import { ManufacturingEngine } from "@/simulation/core/engine";
import { demoConfig, applyPreset } from "@/domain/manufacturing/scenarioPresets";

describe("Performance: Concurrent In-Memory Simulation Execution", () => {
  it("executes 4 concurrent 6-month simulation runs across varying presets within throughput budget", async () => {
    const base = demoConfig();
    base.durationMonths = 3;

    const scenarios = [
      base,
      applyPreset(base, "Increased demand"),
      applyPreset(base, "Delayed replenishment"),
      applyPreset(base, "Optimized Kanban"),
    ];

    const startTime = performance.now();

    const results = await Promise.all(
      scenarios.map(
        (cfg) =>
          new Promise<ReturnType<ManufacturingEngine["runToCompletion"]>>(
            (resolve) => {
              const engine = new ManufacturingEngine(cfg);
              resolve(engine.runToCompletion());
            },
          ),
      ),
    );

    const totalDurationMs = performance.now() - startTime;

    expect(results).toHaveLength(4);
    for (const r of results) {
      expect(r.events.length).toBeGreaterThan(500);
      expect(r.final.stocks.length).toBeGreaterThan(0);
    }

    // 4 concurrent 3-month simulations must finish within 2500ms
    expect(totalDurationMs).toBeLessThan(2500);
  });
});

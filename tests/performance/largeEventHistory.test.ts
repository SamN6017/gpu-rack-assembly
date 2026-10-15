import { describe, it, expect } from "vitest";
import { ManufacturingEngine } from "@/simulation/core/engine";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { runAnalytics } from "@/analytics/runAnalytics";

describe("Performance: Large Event History & Memory Budget", () => {
  it("executes a full 6-calendar-month simulation within performance and memory budgets", () => {
    const config = demoConfig();
    config.durationMonths = 6;
    config.dailyDemand = 15;

    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const engine = new ManufacturingEngine(config);
    const result = engine.runToCompletion();

    const durationMs = performance.now() - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryGrowthMb = (endMemory - startMemory) / (1024 * 1024);

    expect(result.events.length).toBeGreaterThan(1000);
    // Performance budget: 6-month simulation must complete within 3,000ms
    expect(durationMs).toBeLessThan(3000);

    // Memory budget: Heap growth must be under 150 MB
    expect(memoryGrowthMb).toBeLessThan(150);

    // Analytics computation budget
    const analyticsStart = performance.now();
    const analytics = runAnalytics(result);
    const analyticsDurationMs = performance.now() - analyticsStart;

    expect(analyticsDurationMs).toBeLessThan(250);
    expect(analytics.completed).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { ManufacturingEngine } from "@/simulation/core/engine";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { projectSnapshot } from "@/services/assemblySnapshotProjector";

describe("Performance: 3D Playback Projection Latency & Throughput", () => {
  it("projects 5,000 continuous animation frames within sub-millisecond per-frame budget", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 5;

    const engine = new ManufacturingEngine(config);
    const result = engine.runToCompletion();

    const snapshot = result.snapshots[0] || engine.snapshot();
    const frameCount = 5000;

    const startTime = performance.now();

    for (let i = 0; i < frameCount; i++) {
      const projection = projectSnapshot(snapshot, config);
      expect(projection.stations.length).toBe(5);
    }

    const totalDurationMs = performance.now() - startTime;
    const avgLatencyPerFrameMs = totalDurationMs / frameCount;

    // Per-frame projection budget: sub-millisecond (< 0.25ms per frame)
    expect(avgLatencyPerFrameMs).toBeLessThan(0.25);
  });
});

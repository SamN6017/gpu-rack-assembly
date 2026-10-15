import { describe, it, expect, vi } from "vitest";
import { projectSnapshot } from "@/services/assemblySnapshotProjector";
import {
  SimulationAssemblyProvider,
  SavedRunProvider,
} from "@/services/simulationAssemblyProvider";
import { createProvider } from "@/services/providerFactory";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";
import { ManufacturingEngine } from "@/simulation/core/engine";
import { STATION_COORDINATES } from "@/three/factoryLayout";

describe("Phase 5 — 3D Material Flow & Playback Projection", () => {
  it("projects engine snapshots into authoritative AssemblySnapshots for 3D factory scene", () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const engine = new ManufacturingEngine(config);

    // Run until at least one event has happened
    engine.stepEvent();
    engine.stepEvent();

    const snapshot = engine.snapshot();
    const projected = projectSnapshot(snapshot, config);

    expect(projected.mode).toBe("SIMULATION");
    expect(projected.readOnly).toBe(true);
    expect(projected.virtualTime).toBe(snapshot.time);
    expect(projected.manufacturing).toBe(snapshot);
    expect(projected.manufacturingConfig).toBe(config);

    // Verify 5 workstations are projected with correct layout coordinates
    expect(projected.stations.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      const station = projected.stations[i];
      const stationKey = `STATION-${i + 1}`;
      expect(station.id).toBe(stationKey);
      expect(station.number).toBe(i + 1);
      expect(station.position).toEqual(STATION_COORDINATES[stationKey]);
      expect(["RUNNING", "BLOCKED", "EMPTY"]).toContain(station.status);
      expect(station.durationSeconds).toBe(config.cycleSeconds[i]);
    }

    // Verify metrics computation
    expect(projected.metrics.activeRacks).toBe(snapshot.stations.filter(Boolean).length);
    expect(projected.metrics.stationsRunning).toBe(
      projected.stations.filter((s) => s.status === "RUNNING").length,
    );
    expect(projected.metrics.emptyStations).toBe(
      projected.stations.filter((s) => s.status === "EMPTY").length,
    );
    expect(projected.metrics.completedToday).toBe(snapshot.completed);
  });

  it("SimulationAssemblyProvider manages interactive simulation lifecycle and subscribers", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const provider = new SimulationAssemblyProvider(config);

    const initSnapshot = await provider.initialize();
    expect(initSnapshot.mode).toBe("SIMULATION");
    expect(initSnapshot.readOnly).toBe(true);
    expect(initSnapshot.config.isPaused).toBe(true);

    const listener = vi.fn();
    const unsubscribe = provider.subscribe(listener);
    expect(listener).toHaveBeenCalled(); // Called immediately upon subscription

    // Test Play / Pause
    provider.setPaused(false);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ isPaused: false }),
      }),
    );

    // Test Speed Multiplier
    provider.setSpeed(10);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ speedMultiplier: 10 }),
      }),
    );

    // Test Step Event
    const beforeTime = listener.mock.calls[listener.mock.calls.length - 1][0].virtualTime;
    provider.stepEvent();
    const afterTime = listener.mock.calls[listener.mock.calls.length - 1][0].virtualTime;
    expect(afterTime).toBeGreaterThanOrEqual(beforeTime);

    // Test Reset
    provider.resetSimulation();
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ isPaused: true }),
      }),
    );

    unsubscribe();
    provider.destroy();
  });

  it("SavedRunProvider replays historical snapshots and allows scrub / seek navigation", async () => {
    const config = demoConfig();
    config.durationMonths = 1;
    const engine = new ManufacturingEngine(config);
    const result = engine.runToCompletion();

    expect(result.snapshots.length).toBeGreaterThan(0);

    const provider = new SavedRunProvider(result.snapshots, config);
    const initSnapshot = await provider.initialize();
    expect(initSnapshot.virtualTime).toBe(result.snapshots[0].time);

    const listener = vi.fn();
    const unsubscribe = provider.subscribe(listener);

    // Seek to index
    provider.seek(Math.min(5, result.snapshots.length - 1));
    expect(listener).toHaveBeenCalled();

    // Step forward
    provider.stepEvent();
    expect(listener).toHaveBeenCalled();

    // Jump to timestamp
    const targetTimestamp = result.snapshots[result.snapshots.length - 1].time;
    provider.jumpTo(targetTimestamp);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({
        virtualTime: targetTimestamp,
      }),
    );

    unsubscribe();
    provider.destroy();
  });

  it("createProvider factory produces appropriate providers with typed overloads", () => {
    const simProvider = createProvider("SIMULATION");
    expect(simProvider).toBeInstanceOf(SimulationAssemblyProvider);
    simProvider.destroy();

    const legacyProvider = createProvider("LEGACY_DEMO");
    expect(legacyProvider).toBeDefined();
    legacyProvider.destroy();

    const config = demoConfig();
    config.durationMonths = 1;
    const engine = new ManufacturingEngine(config);
    const res = engine.runToCompletion();

    const savedProvider = createProvider("SAVED_RUN", {
      snapshots: res.snapshots,
      config,
    });
    expect(savedProvider).toBeInstanceOf(SavedRunProvider);
    savedProvider.destroy();
  });
});

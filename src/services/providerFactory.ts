/**
 * Provider factory — selects the correct IAssemblyDataProvider implementation
 * based on the requested mode. This keeps the store and UI agnostic of
 * concrete provider construction.
 *
 * SIMULATION — ManufacturingEngine running in the browser with a demo config.
 *   Default for offline / no-database usage.
 * LEGACY_DEMO — Original mock provider backed by the legacy simulationEngine.ts.
 *   Preserved for compatibility regression during Phase 5 parity work.
 * SAVED_RUN — Replay a completed persisted run from its stored snapshots.
 *   Requires runId and a pre-fetched snapshot + config payload.
 */
import { IAssemblyDataProvider } from "./assemblyDataProvider";
import {
  SimulationAssemblyProvider,
  SavedRunProvider,
} from "./simulationAssemblyProvider";
import { MockAssemblyDataProvider } from "./mockAssemblyProvider";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";

export type ProviderMode = "SIMULATION" | "LEGACY_DEMO" | "SAVED_RUN";

export interface SavedRunPayload {
  snapshots: Snapshot[];
  config: SimulationConfig;
}

export function createProvider(
  mode: "SIMULATION" | "LEGACY_DEMO",
): IAssemblyDataProvider;
export function createProvider(
  mode: "SAVED_RUN",
  payload: SavedRunPayload,
): IAssemblyDataProvider;
export function createProvider(
  mode: ProviderMode,
  payload?: SavedRunPayload,
): IAssemblyDataProvider {
  switch (mode) {
    case "SIMULATION":
      return new SimulationAssemblyProvider();
    case "LEGACY_DEMO":
      return new MockAssemblyDataProvider();
    case "SAVED_RUN": {
      if (!payload)
        throw new Error("SAVED_RUN mode requires a SavedRunPayload");
      return new SavedRunProvider(payload.snapshots, payload.config);
    }
    default:
      throw new Error(`Unknown provider mode: ${mode}`);
  }
}

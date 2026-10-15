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
 * LIVE — Real-time read-only event streaming provider.
 * REPLAY — Chronological read-only replay provider for recorded events.
 */
import { IAssemblyDataProvider } from "./assemblyDataProvider";
import {
  SimulationAssemblyProvider,
  SavedRunProvider,
} from "./simulationAssemblyProvider";
import { MockAssemblyDataProvider } from "./mockAssemblyProvider";
import { RealtimeAssemblyProvider } from "./realtimeAssemblyProvider";
import { ReplayAssemblyProvider } from "./replayAssemblyProvider";
import { MockLiveAdapter, ReadOnlyEventAdapter } from "./adapters";
import type { SimulationConfig, Snapshot } from "@/simulation/core/types";
import type { AssemblySnapshot } from "@/types/assembly";
import type { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";

export type ProviderMode =
  | "SIMULATION"
  | "LEGACY_DEMO"
  | "SAVED_RUN"
  | "LIVE"
  | "REPLAY";

export interface SavedRunPayload {
  snapshots: Snapshot[];
  config: SimulationConfig;
}

export interface LiveProviderPayload {
  adapter?: ReadOnlyEventAdapter;
  initialSnapshot?: AssemblySnapshot;
}

export interface ReplayProviderPayload {
  events: ManufacturingEvent[];
  initialSnapshot?: AssemblySnapshot;
}

export function createProvider(
  mode: "SIMULATION" | "LEGACY_DEMO",
): IAssemblyDataProvider;
export function createProvider(
  mode: "SAVED_RUN",
  payload: SavedRunPayload,
): IAssemblyDataProvider;
export function createProvider(
  mode: "LIVE",
  payload?: LiveProviderPayload,
): IAssemblyDataProvider;
export function createProvider(
  mode: "REPLAY",
  payload: ReplayProviderPayload,
): IAssemblyDataProvider;
export function createProvider(
  mode: ProviderMode,
  payload?: unknown,
): IAssemblyDataProvider {
  switch (mode) {
    case "SIMULATION":
      return new SimulationAssemblyProvider();
    case "LEGACY_DEMO":
      return new MockAssemblyDataProvider();
    case "SAVED_RUN": {
      const p = payload as SavedRunPayload;
      if (!p) throw new Error("SAVED_RUN mode requires a SavedRunPayload");
      return new SavedRunProvider(p.snapshots, p.config);
    }
    case "LIVE": {
      const p = (payload as LiveProviderPayload) || {};
      const adapter = p.adapter || new MockLiveAdapter();
      return new RealtimeAssemblyProvider(adapter, p.initialSnapshot);
    }
    case "REPLAY": {
      const p = payload as ReplayProviderPayload;
      if (!p?.events) throw new Error("REPLAY mode requires events array in payload");
      return new ReplayAssemblyProvider(p.events, p.initialSnapshot);
    }
    default:
      throw new Error(`Unknown provider mode: ${mode}`);
  }
}

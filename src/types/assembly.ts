import { Rack } from "./rack";
import { Station } from "./station";

export type SimulationSpeed = 1 | 2 | 5 | 10 | 60;

export interface AssemblyConfig {
  baseStationDurationSeconds: number; // 720 seconds (12 minutes)
  demoDurationSeconds: number; // 12 seconds
  isDemoMode: boolean;
  speedMultiplier: SimulationSpeed;
  isPaused: boolean;
  transitionDurationMs: number; // visual transit time in ms
}

export interface AssemblyMetrics {
  activeRacks: number;
  stationsRunning: number;
  emptyStations: number;
  completedToday: number;
  averageCycleTimeMinutes: number;
  queueCount: number;
  systemHealth: "OPTIMAL" | "ATTENTION" | "BLOCKED";
  bottleneckStationId: string | null;
}

export interface ProductionEvent {
  id: string;
  timestamp: number;
  type:
    | "RACK_ENTERED"
    | "RACK_COMPLETED_STATION"
    | "RACK_TRANSIT_START"
    | "RACK_BLOCKED"
    | "RACK_COMPLETED_LINE"
    | "RACK_QUEUED";
  rackId: string;
  stationId?: string;
  message: string;
}

export interface AssemblySnapshot {
  mode?: "SIMULATION" | "LIVE" | "REPLAY" | "LEGACY_DEMO";
  virtualTime?: number;
  readOnly?: boolean;
  manufacturing?: import("@/simulation/core/types").Snapshot;
  manufacturingConfig?: import("@/simulation/core/types").SimulationConfig;
  stations: Station[];
  racks: Record<string, Rack>;
  queueRackIds: string[];
  completedRackIds: string[];
  metrics: AssemblyMetrics;
  events: ProductionEvent[];
  config: AssemblyConfig;
  selectedStationId: string | null;
  selectedRackId: string | null;
}

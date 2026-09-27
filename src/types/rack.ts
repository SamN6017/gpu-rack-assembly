export type RackStatus =
  | "QUEUED"
  | "MOVING"
  | "RUNNING"
  | "READY"
  | "BLOCKED"
  | "COMPLETED";

export interface RackTelemetry {
  gpuModel: string;
  chassisType: string;
  serialNumber: string;
  weightKg: number;
  powerKw: number;
  tempCelsius: number;
  gpuCount: number;
  testPassRatePercent: number;
}

export interface Rack {
  id: string;
  modelName: string;
  status: RackStatus;
  currentStationId: string | null;
  previousStationId?: string | null;
  targetStationId?: string | null;
  moveProgress?: number; // 0 to 1 during animated transition
  enteredStationAt: number | null; // timestamp when entered current station
  completedStations: string[]; // IDs of stations passed through
  telemetry: RackTelemetry;
  createdTimestamp: number;
  completedTimestamp?: number;
}

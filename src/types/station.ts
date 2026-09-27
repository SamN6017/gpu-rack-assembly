export type StationStatus = "EMPTY" | "RUNNING" | "COMPLETE" | "BLOCKED";

export interface Station {
  id: string; // e.g. "STATION-1"
  number: number; // 1 to 5
  name: string; // descriptive industrial step name
  processDescription: string;
  status: StationStatus;
  rackId: string | null;
  enteredAt: number | null; // timestamp when rack entered station
  durationSeconds: number; // standard duration (e.g. 720s)
  position: [number, number, number]; // 3D world position [x, y, z]
}

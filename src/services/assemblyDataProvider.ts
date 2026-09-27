import { AssemblySnapshot, SimulationSpeed } from "@/types/assembly";

export interface IAssemblyDataProvider {
  initialize(): Promise<AssemblySnapshot>;
  subscribe(listener: (snapshot: AssemblySnapshot) => void): () => void;
  addRackToQueue(modelName?: string): void;
  dispatchNextFromQueue(): void;
  removeRackFromQueue(rackId: string): void;
  advanceStation(stationId: string): void;
  toggleStationBlock(stationId: string): void;
  stressTestRack(rackId: string): void;
  setPaused(paused: boolean): void;
  setSpeed(speed: SimulationSpeed): void;
  setDemoMode(isDemo: boolean): void;
  resetSimulation(): void;
  destroy(): void;
}

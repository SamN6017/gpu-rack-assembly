import { IAssemblyDataProvider } from "./assemblyDataProvider";
import { AssemblySnapshot, SimulationSpeed } from "@/types/assembly";
import { SimulationEngine } from "@/simulation/simulationEngine";

export class MockAssemblyDataProvider implements IAssemblyDataProvider {
  private engine: SimulationEngine;

  constructor() {
    this.engine = new SimulationEngine();
    this.engine.start();
  }

  public async initialize(): Promise<AssemblySnapshot> {
    return this.engine.getSnapshot();
  }

  public subscribe(listener: (snapshot: AssemblySnapshot) => void): () => void {
    return this.engine.subscribe(listener);
  }

  public addRackToQueue(modelName?: string): void {
    this.engine.addRackToQueue(modelName);
  }

  public dispatchNextFromQueue(): void {
    this.engine.dispatchNextFromQueue();
  }

  public removeRackFromQueue(rackId: string): void {
    this.engine.removeRackFromQueue(rackId);
  }

  public advanceStation(stationId: string): void {
    this.engine.advanceStation(stationId);
  }

  public toggleStationBlock(stationId: string): void {
    this.engine.toggleStationBlock(stationId);
  }

  public stressTestRack(rackId: string): void {
    this.engine.stressTestRack(rackId);
  }

  public setPaused(paused: boolean): void {
    this.engine.setPaused(paused);
  }

  public setSpeed(speed: SimulationSpeed): void {
    this.engine.setSpeed(speed);
  }

  public setDemoMode(isDemo: boolean): void {
    this.engine.setDemoMode(isDemo);
  }

  public resetSimulation(): void {
    this.engine.reset();
  }

  public selectStation(stationId: string | null): void {
    this.engine.selectStation(stationId);
  }

  public selectRack(rackId: string | null): void {
    this.engine.selectRack(rackId);
  }

  public destroy(): void {
    this.engine.stop();
  }
}

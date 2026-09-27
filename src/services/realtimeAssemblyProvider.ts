import { IAssemblyDataProvider } from "./assemblyDataProvider";
import { AssemblySnapshot, SimulationSpeed } from "@/types/assembly";

/**
 * RealtimeAssemblyProvider
 * Prepared architecture for live factory IoT telemetry and manufacturing execution systems (MES).
 * Communicates via WebSocket / Server-Sent Events / MQTT broker.
 */
export class RealtimeAssemblyProvider implements IAssemblyDataProvider {
  private ws: WebSocket | null = null;
  private endpointUrl: string;
  private listeners: Set<(snapshot: AssemblySnapshot) => void> = new Set();
  private currentSnapshot: AssemblySnapshot | null = null;

  constructor(endpointUrl: string = "wss://api.factory-twin.internal/v1/assembly-feed") {
    this.endpointUrl = endpointUrl;
  }

  public async initialize(): Promise<AssemblySnapshot> {
    // In production, fetch initial state snapshot via HTTP GET /v1/assembly/snapshot
    // and establish WebSocket connection for live telemetry stream.
    if (this.currentSnapshot) {
      return this.currentSnapshot;
    }
    // Return fallback / mock until live connection established
    throw new Error("Realtime endpoint not configured in prototype environment. Switch to MockAssemblyDataProvider.");
  }

  public subscribe(listener: (snapshot: AssemblySnapshot) => void): () => void {
    this.listeners.add(listener);
    if (this.currentSnapshot) {
      listener(this.currentSnapshot);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addRackToQueue(modelName?: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "QUEUE_RACK", modelName }));
    }
  }

  public dispatchNextFromQueue(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "DISPATCH_QUEUE" }));
    }
  }

  public removeRackFromQueue(rackId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "REMOVE_QUEUE_RACK", rackId }));
    }
  }

  public advanceStation(stationId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "ADVANCE_STATION", stationId }));
    }
  }

  public toggleStationBlock(stationId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "TOGGLE_BLOCK", stationId }));
    }
  }

  public stressTestRack(rackId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "STRESS_TEST", rackId }));
    }
  }

  public setPaused(paused: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "SET_PAUSED", paused }));
    }
  }

  public setSpeed(speed: SimulationSpeed): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "SET_SPEED", speed }));
    }
  }

  public setDemoMode(isDemo: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "SET_DEMO_MODE", isDemo }));
    }
  }

  public resetSimulation(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "RESET" }));
    }
  }

  public destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

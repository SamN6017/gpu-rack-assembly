import { IAssemblyDataProvider } from "./assemblyDataProvider";
import { AssemblySnapshot, SimulationSpeed } from "@/types/assembly";
import {
  ReadOnlyEventAdapter,
  ConnectionState,
} from "./adapters";
import { EventProjection } from "@/domain/manufacturing/manufacturingEvent";

/**
 * Real-time assembly provider for live factory streaming.
 * External data is strictly read-only; all outbound control commands throw errors.
 */
export class RealtimeAssemblyProvider implements IAssemblyDataProvider {
  readonly isReadOnly = true;
  private listeners = new Set<(snapshot: AssemblySnapshot) => void>();
  private disconnect: (() => void) | null = null;
  readonly projection = new EventProjection();
  connection: ConnectionState = { status: "DISCONNECTED", lastReceived: null };

  constructor(
    private adapter?: ReadOnlyEventAdapter,
    private currentSnapshot?: AssemblySnapshot,
  ) {}

  async initialize(): Promise<AssemblySnapshot> {
    if (!this.adapter || !this.currentSnapshot) {
      throw new Error(
        "An authorized adapter and confirmed initial snapshot are required",
      );
    }

    this.currentSnapshot = {
      ...this.currentSnapshot,
      mode: "LIVE",
      readOnly: true,
    };

    this.disconnect = this.adapter.connect(
      (event) => {
        this.projection.ingest(event);
        if (this.currentSnapshot) {
          this.currentSnapshot = {
            ...this.currentSnapshot,
            virtualTime: Date.parse(event.sourceTimestamp),
          };
          for (const listener of this.listeners) {
            listener(this.currentSnapshot);
          }
        }
      },
      (status) => {
        this.connection = status;
      },
    );

    return this.currentSnapshot;
  }

  subscribe(listener: (snapshot: AssemblySnapshot) => void): () => void {
    this.listeners.add(listener);
    if (this.currentSnapshot) {
      listener(this.currentSnapshot);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  // --- Strict Read-Only Capability Enforcement ---
  addRackToQueue(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  dispatchNextFromQueue(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  removeRackFromQueue(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  advanceStation(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  toggleStationBlock(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  stressTestRack(): void {
    throw new Error("Live mode is strictly read-only: factory control commands are prohibited.");
  }

  resetSimulation(): void {
    throw new Error("Live mode is strictly read-only: resetting real factory state is prohibited.");
  }

  setPaused(): void {}

  setSpeed(_speed: SimulationSpeed): void {}

  setDemoMode(): void {}

  destroy(): void {
    this.disconnect?.();
    this.listeners.clear();
    this.connection = { status: "DISCONNECTED", lastReceived: null };
  }
}

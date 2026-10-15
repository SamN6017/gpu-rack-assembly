import { IAssemblyDataProvider } from "./assemblyDataProvider";
import { AssemblySnapshot, SimulationSpeed } from "@/types/assembly";
import {
  ManufacturingEvent,
  EventProjection,
} from "@/domain/manufacturing/manufacturingEvent";

/**
 * Replay assembly provider that plays back recorded manufacturing events
 * chronologically without altering operational inventory or sending control commands.
 */
export class ReplayAssemblyProvider implements IAssemblyDataProvider {
  readonly isReadOnly = true;
  private listeners = new Set<(snapshot: AssemblySnapshot) => void>();
  private projection = new EventProjection();
  private events: ManufacturingEvent[] = [];
  private eventIndex = 0;
  private timer: NodeJS.Timeout | null = null;
  private isPaused = false;
  private speed: SimulationSpeed = 1;

  constructor(
    events: ManufacturingEvent[],
    private currentSnapshot?: AssemblySnapshot,
  ) {
    this.events = [...events].sort(
      (a, b) =>
        Date.parse(a.sourceTimestamp) - Date.parse(b.sourceTimestamp) ||
        a.sourceSystem.localeCompare(b.sourceSystem) ||
        a.eventId.localeCompare(b.eventId),
    );
  }

  async initialize(): Promise<AssemblySnapshot> {
    if (!this.currentSnapshot) {
      throw new Error("Initial snapshot is required for replay provider");
    }

    this.currentSnapshot = {
      ...this.currentSnapshot,
      mode: "REPLAY",
      readOnly: true,
      virtualTime: this.events.length
        ? Date.parse(this.events[0].sourceTimestamp)
        : Date.now(),
    };

    this.startPlayback();
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

  private notify() {
    if (!this.currentSnapshot) return;
    for (const listener of this.listeners) {
      listener(this.currentSnapshot);
    }
  }

  private startPlayback() {
    if (this.timer) clearInterval(this.timer);
    const intervalMs = Math.max(50, Math.floor(1000 / this.speed));

    this.timer = setInterval(() => {
      if (this.isPaused || this.eventIndex >= this.events.length) return;

      const event = this.events[this.eventIndex++];
      this.projection.ingest(event);

      if (this.currentSnapshot) {
        this.currentSnapshot = {
          ...this.currentSnapshot,
          virtualTime: Date.parse(event.sourceTimestamp),
        };
        this.notify();
      }
    }, intervalMs);
  }

  // --- Strict Read-Only Capability Enforcement ---
  addRackToQueue(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  dispatchNextFromQueue(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  removeRackFromQueue(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  advanceStation(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  toggleStationBlock(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  stressTestRack(): void {
    throw new Error("Replay mode is read-only: factory control commands are prohibited.");
  }

  resetSimulation(): void {
    this.eventIndex = 0;
    this.projection = new EventProjection();
    if (this.currentSnapshot && this.events.length) {
      this.currentSnapshot = {
        ...this.currentSnapshot,
        virtualTime: Date.parse(this.events[0].sourceTimestamp),
      };
      this.notify();
    }
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  setSpeed(speed: SimulationSpeed): void {
    this.speed = speed;
    this.startPlayback();
  }

  setDemoMode(): void {}

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.listeners.clear();
  }
}

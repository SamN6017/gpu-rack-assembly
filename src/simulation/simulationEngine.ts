import {
  AssemblyConfig,
  AssemblyMetrics,
  AssemblySnapshot,
  ProductionEvent,
  SimulationSpeed,
} from "@/types/assembly";
import { Rack, RackStatus } from "@/types/rack";
import { Station, StationStatus } from "@/types/station";

import { STATION_COORDINATES } from "@/three/factoryLayout";
export { STATION_COORDINATES } from "@/three/factoryLayout";

const INITIAL_STATIONS: Station[] = [
  {
    id: "STATION-1",
    number: 1,
    name: "Chassis & Busbar Assembly",
    processDescription: "Structural frame alignment, 48V/54V copper busbars & power shelf insertion",
    status: "RUNNING",
    rackId: "RACK-005",
    enteredAt: 0, // calculated in init
    durationSeconds: 720,
    position: STATION_COORDINATES["STATION-1"],
  },
  {
    id: "STATION-2",
    number: 2,
    name: "Liquid Cold-Plate & GPU Trays",
    processDescription: "8x SXM5/B200 GPU sled insertion, quick-disconnect blind-mate manifold connection",
    status: "RUNNING",
    rackId: "RACK-004",
    enteredAt: 0,
    durationSeconds: 720,
    position: STATION_COORDINATES["STATION-2"],
  },
  {
    id: "STATION-3",
    number: 3,
    name: "Power & Switch Integration",
    processDescription: "33kW PSU banks, Top-of-Rack 800G Quantum InfiniBand switches install",
    status: "EMPTY",
    rackId: null,
    enteredAt: null,
    durationSeconds: 720,
    position: STATION_COORDINATES["STATION-3"],
  },
  {
    id: "STATION-4",
    number: 4,
    name: "Optical Loom & Harnessing",
    processDescription: "Active optical cabling, internal telemetry routing, cable arm strain relief",
    status: "RUNNING",
    rackId: "RACK-002",
    enteredAt: 0,
    durationSeconds: 720,
    position: STATION_COORDINATES["STATION-4"],
  },
  {
    id: "STATION-5",
    number: 5,
    name: "Automated QA & Burn-in",
    processDescription: "Coolant pressure decay leak testing, full 120kW load bank thermal soak",
    status: "RUNNING",
    rackId: "RACK-001",
    enteredAt: 0,
    durationSeconds: 720,
    position: STATION_COORDINATES["STATION-5"],
  },
];

export class SimulationEngine {
  private stations: Station[] = [];
  private racks: Record<string, Rack> = {};
  private queueRackIds: string[] = [];
  private completedRackIds: string[] = [];
  private events: ProductionEvent[] = [];
  private config: AssemblyConfig = {
    baseStationDurationSeconds: 720, // 12 minutes
    demoDurationSeconds: 12, // 12 seconds
    isDemoMode: false,
    speedMultiplier: 1,
    isPaused: false,
    transitionDurationMs: 3000, // 3s visual movement along path
  };
  private nextRackIndex = 9;
  private listeners: Set<(snapshot: AssemblySnapshot) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private lastTickTimestamp: number = Date.now();
  private selectedStationId: string | null = null;
  private selectedRackId: string | null = null;

  constructor() {
    this.reset();
  }

  public reset() {
    const now = Date.now();
    // Default config: 720s in production mode, or scaled
    const duration = this.config.isDemoMode
      ? this.config.demoDurationSeconds
      : this.config.baseStationDurationSeconds;

    // Build Initial Racks
    this.racks = {
      "RACK-000": {
        id: "RACK-000",
        modelName: "NVIDIA GB200 NVL72",
        status: "COMPLETED",
        currentStationId: null,
        enteredStationAt: null,
        completedStations: ["STATION-1", "STATION-2", "STATION-3", "STATION-4", "STATION-5"],
        telemetry: {
          gpuModel: "NVIDIA Blackwell B200",
          chassisType: "42U Titanium Rack",
          serialNumber: "SN-B200-99801",
          weightKg: 1350,
          powerKw: 120.4,
          tempCelsius: 42.1,
          gpuCount: 72,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 3600000,
        completedTimestamp: now - 60000,
      },
      "RACK-001": {
        id: "RACK-001",
        modelName: "NVIDIA GB200 NVL72",
        status: "RUNNING",
        currentStationId: "STATION-5",
        // Prompt scenario: Station 5 Rack 001 running with ~01:45 remaining out of 12:00
        enteredStationAt: now - (duration - 105) * 1000,
        completedStations: ["STATION-1", "STATION-2", "STATION-3", "STATION-4"],
        telemetry: {
          gpuModel: "NVIDIA Blackwell B200",
          chassisType: "42U Titanium Rack",
          serialNumber: "SN-B200-88012",
          weightKg: 1345,
          powerKw: 118.2,
          tempCelsius: 48.3,
          gpuCount: 72,
          testPassRatePercent: 99.8,
        },
        createdTimestamp: now - 2800000,
      },
      "RACK-002": {
        id: "RACK-002",
        modelName: "NVIDIA GB200 NVL72",
        status: "RUNNING",
        currentStationId: "STATION-4",
        // Station 4 Rack 002: ~09:12 remaining
        enteredStationAt: now - (duration - 552) * 1000,
        completedStations: ["STATION-1", "STATION-2", "STATION-3"],
        telemetry: {
          gpuModel: "NVIDIA Blackwell B200",
          chassisType: "42U Titanium Rack",
          serialNumber: "SN-B200-88029",
          weightKg: 1120,
          powerKw: 42.5,
          tempCelsius: 32.0,
          gpuCount: 72,
          testPassRatePercent: 99.4,
        },
        createdTimestamp: now - 2100000,
      },
      "RACK-004": {
        id: "RACK-004",
        modelName: "NVIDIA H100 NVL Supercluster",
        status: "RUNNING",
        currentStationId: "STATION-2",
        // Station 2 Rack 004: ~03:41 remaining
        enteredStationAt: now - (duration - 221) * 1000,
        completedStations: ["STATION-1"],
        telemetry: {
          gpuModel: "NVIDIA Hopper H100 SXM5",
          chassisType: "48U Enterprise Rack",
          serialNumber: "SN-H100-77341",
          weightKg: 980,
          powerKw: 10.2,
          tempCelsius: 28.5,
          gpuCount: 32,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 1400000,
      },
      "RACK-005": {
        id: "RACK-005",
        modelName: "NVIDIA H100 NVL Supercluster",
        status: "RUNNING",
        currentStationId: "STATION-1",
        // Station 1 Rack 005: ~07:23 remaining
        enteredStationAt: now - (duration - 443) * 1000,
        completedStations: [],
        telemetry: {
          gpuModel: "NVIDIA Hopper H100 SXM5",
          chassisType: "48U Enterprise Rack",
          serialNumber: "SN-H100-77355",
          weightKg: 420,
          powerKw: 2.1,
          tempCelsius: 24.2,
          gpuCount: 32,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 700000,
      },
      "RACK-006": {
        id: "RACK-006",
        modelName: "NVIDIA B200 Dual-Node",
        status: "QUEUED",
        currentStationId: null,
        enteredStationAt: null,
        completedStations: [],
        telemetry: {
          gpuModel: "NVIDIA Blackwell B200",
          chassisType: "42U Titanium Rack",
          serialNumber: "SN-B200-99104",
          weightKg: 280,
          powerKw: 0,
          tempCelsius: 22.0,
          gpuCount: 64,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 300000,
      },
      "RACK-007": {
        id: "RACK-007",
        modelName: "NVIDIA GB200 NVL72",
        status: "QUEUED",
        currentStationId: null,
        enteredStationAt: null,
        completedStations: [],
        telemetry: {
          gpuModel: "NVIDIA Blackwell B200",
          chassisType: "42U Titanium Rack",
          serialNumber: "SN-B200-99105",
          weightKg: 280,
          powerKw: 0,
          tempCelsius: 22.0,
          gpuCount: 72,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 200000,
      },
      "RACK-008": {
        id: "RACK-008",
        modelName: "AMD Instinct MI300X OAM",
        status: "QUEUED",
        currentStationId: null,
        enteredStationAt: null,
        completedStations: [],
        telemetry: {
          gpuModel: "AMD Instinct MI300X",
          chassisType: "48U Open19 v2 Rack",
          serialNumber: "SN-MI300-44911",
          weightKg: 290,
          powerKw: 0,
          tempCelsius: 21.8,
          gpuCount: 64,
          testPassRatePercent: 100,
        },
        createdTimestamp: now - 100000,
      },
    };

    // Deep clone station definition and link enteredAt
    this.stations = INITIAL_STATIONS.map((s) => {
      let enteredAt: number | null = null;
      if (s.rackId && this.racks[s.rackId]) {
        enteredAt = this.racks[s.rackId].enteredStationAt;
      }
      return {
        ...s,
        enteredAt,
        durationSeconds: duration,
      };
    });

    this.queueRackIds = ["RACK-006", "RACK-007", "RACK-008"];
    this.completedRackIds = ["RACK-000"];

    this.events = [
      {
        id: "EVT-INIT",
        timestamp: now,
        type: "RACK_ENTERED",
        rackId: "RACK-005",
        stationId: "STATION-1",
        message: "Digital Twin line initialized with active production state.",
      },
    ];

    this.lastTickTimestamp = Date.now();
    this.notify();
  }

  public start() {
    if (this.intervalId) return;
    this.lastTickTimestamp = Date.now();
    this.intervalId = setInterval(() => {
      this.tick();
    }, 100); // 10Hz simulation update for smooth movement & precise countdowns
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setPaused(paused: boolean) {
    this.config.isPaused = paused;
    this.notify();
  }

  public setSpeed(speed: SimulationSpeed) {
    this.config.speedMultiplier = speed;
    this.notify();
  }

  public setDemoMode(isDemo: boolean) {
    this.config.isDemoMode = isDemo;
    const effectiveDuration = isDemo
      ? this.config.demoDurationSeconds
      : this.config.baseStationDurationSeconds;

    // Rescale enteredAt for running stations so progress percentage remains consistent
    const now = Date.now();
    this.stations.forEach((station) => {
      station.durationSeconds = effectiveDuration;
      if (station.rackId && this.racks[station.rackId]) {
        const rack = this.racks[station.rackId];
        // Keep progress roughly equivalent
        if (rack.enteredStationAt) {
          rack.enteredStationAt = now - (effectiveDuration * 0.4) * 1000;
          station.enteredAt = rack.enteredStationAt;
        }
      }
    });

    this.notify();
  }

  public addRackToQueue(modelName?: string) {
    const id = `RACK-${String(this.nextRackIndex++).padStart(3, "0")}`;
    const now = Date.now();
    const model = modelName || "NVIDIA GB200 NVL72";
    
    let gpuModel = "NVIDIA Blackwell B200";
    let gpuCount = 72;
    let power = 120;
    let weight = 1350;

    if (model.includes("H100")) {
      gpuModel = "NVIDIA Hopper H100 SXM5";
      gpuCount = 32;
      power = 40;
      weight = 980;
    } else if (model.includes("MI300")) {
      gpuModel = "AMD Instinct MI300X";
      gpuCount = 64;
      power = 55;
      weight = 1050;
    } else if (model.includes("B200 Dual")) {
      gpuModel = "NVIDIA Blackwell B200";
      gpuCount = 64;
      power = 65;
      weight = 1100;
    }

    const newRack: Rack = {
      id,
      modelName: model,
      status: "QUEUED",
      currentStationId: null,
      enteredStationAt: null,
      completedStations: [],
      telemetry: {
        gpuModel,
        chassisType: "42U Titanium Rack",
        serialNumber: `SN-GPU-${Math.floor(10000 + Math.random() * 90000)}`,
        weightKg: weight,
        powerKw: power,
        tempCelsius: 22.5,
        gpuCount,
        testPassRatePercent: 100,
      },
      createdTimestamp: now,
    };

    this.racks[id] = newRack;
    this.queueRackIds.push(id);
    this.recordEvent("RACK_QUEUED", id, undefined, `${id} (${model}) staged in Ingestion Queue`);
    this.notify();
  }

  public advanceStation(stationId: string) {
    const station = this.stations.find((s) => s.id === stationId);
    if (!station || !station.rackId) return;
    const rack = this.racks[station.rackId];
    if (!rack) return;

    const duration = station.durationSeconds || 720;
    // Set enteredAt so elapsed time triggers 100% completion
    rack.enteredStationAt = Date.now() - (duration + 2) * 1000;
    station.enteredAt = rack.enteredStationAt;
    station.status = "COMPLETE";
    rack.status = "READY";
    this.recordEvent(
      "RACK_COMPLETED_STATION",
      rack.id,
      station.id,
      `Manual Fast-Forward: ${rack.id} completed assembly step at ${station.name}`
    );
    this.tick();
    this.notify();
  }

  public toggleStationBlock(stationId: string) {
    const station = this.stations.find((s) => s.id === stationId);
    if (!station) return;
    if (station.status === "BLOCKED") {
      station.status = station.rackId ? "RUNNING" : "EMPTY";
      if (station.rackId && this.racks[station.rackId]) {
        this.racks[station.rackId].status = "RUNNING";
      }
      this.recordEvent("RACK_ENTERED", station.rackId || "LINE", station.id, `Manual override: ${station.id} unblocked.`);
    } else {
      station.status = "BLOCKED";
      if (station.rackId && this.racks[station.rackId]) {
        this.racks[station.rackId].status = "BLOCKED";
      }
      this.recordEvent("RACK_BLOCKED", station.rackId || "LINE", station.id, `Manual fault injection: ${station.id} set to BLOCKED.`);
    }
    this.notify();
  }

  public dispatchNextFromQueue() {
    const station1 = this.stations[0];
    const isStation1Targeted = Object.values(this.racks).some(
      (r) => r.status === "MOVING" && r.targetStationId === station1.id
    );

    if (station1.status === "EMPTY" && !station1.rackId && !isStation1Targeted && this.queueRackIds.length > 0) {
      const nextRackId = this.queueRackIds.shift()!;
      const rack = this.racks[nextRackId];
      if (rack) {
        this.startRackMovement(rack, null, station1, station1.id);
        this.notify();
      }
    } else {
      this.recordEvent(
        "RACK_BLOCKED",
        this.queueRackIds[0] || "QUEUE",
        station1.id,
        "Cannot dispatch: Station 1 is currently occupied. Wait or advance Station 1."
      );
      this.notify();
    }
  }

  public removeRackFromQueue(rackId: string) {
    this.queueRackIds = this.queueRackIds.filter((id) => id !== rackId);
    delete this.racks[rackId];
    this.notify();
  }

  public stressTestRack(rackId: string) {
    const rack = this.racks[rackId];
    if (!rack || !rack.telemetry) return;
    rack.telemetry.tempCelsius = +(rack.telemetry.tempCelsius + (Math.random() * 6 + 2)).toFixed(1);
    rack.telemetry.powerKw = +(rack.telemetry.powerKw * 1.1).toFixed(1);
    this.notify();
  }

  public selectStation(stationId: string | null) {
    this.selectedStationId = stationId;
    this.notify();
  }

  public selectRack(rackId: string | null) {
    this.selectedRackId = rackId;
    this.notify();
  }

  private tick() {
    const now = Date.now();
    const deltaMs = now - this.lastTickTimestamp;
    this.lastTickTimestamp = now;

    if (this.config.isPaused) return;

    // Multiply elapsed simulation time by speed multiplier
    const simDeltaMs = deltaMs * this.config.speedMultiplier;
    const effectiveDurationSec = this.config.isDemoMode
      ? this.config.demoDurationSeconds
      : this.config.baseStationDurationSeconds;

    let stateChanged = false;

    // 1. Process active Racks moving between stations
    for (const rackId of Object.keys(this.racks)) {
      const rack = this.racks[rackId];
      if (rack.status === "MOVING" && rack.moveProgress !== undefined) {
        // Transit takes transitionDurationMs
        const moveStep = simDeltaMs / this.config.transitionDurationMs;
        rack.moveProgress = Math.min(1.0, rack.moveProgress + moveStep);
        stateChanged = true;

        if (rack.moveProgress >= 1.0) {
          // Arrived at destination!
          this.handleRackArrival(rack);
        }
      }
    }

    // 2. Process Station processing timers
    this.stations.forEach((station) => {
      if (station.rackId && station.status === "RUNNING") {
        const rack = this.racks[station.rackId];
        if (rack && rack.enteredStationAt) {
          // Adjust enteredAt artificially according to speedMultiplier if needed
          if (this.config.speedMultiplier > 1) {
            rack.enteredStationAt -= (simDeltaMs - deltaMs);
            station.enteredAt = rack.enteredStationAt;
          }

          const elapsedSec = (now - rack.enteredStationAt) / 1000;
          if (elapsedSec >= effectiveDurationSec) {
            // Station process is complete!
            station.status = "COMPLETE";
            rack.status = "READY";
            stateChanged = true;
            this.recordEvent(
              "RACK_COMPLETED_STATION",
              rack.id,
              station.id,
              `${rack.id} completed assembly step at ${station.name}`
            );
          }
        }
      }
    });

    // 3. Movement & Blocking Logic
    // Evaluate stations in reverse order (Station 5 down to 1) so forward positions clear first
    for (let i = this.stations.length - 1; i >= 0; i--) {
      const station = this.stations[i];
      if (station.status === "COMPLETE" && station.rackId) {
        const rack = this.racks[station.rackId];
        const isLastStation = i === this.stations.length - 1;

        if (isLastStation) {
          // Move from Station 5 to Completed Storage Bay
          this.startRackMovement(rack, station, null, "COMPLETED");
          stateChanged = true;
        } else {
          const nextStation = this.stations[i + 1];
          // Check if next station is EMPTY and no other rack is currently moving into it
          const isNextTargeted = Object.values(this.racks).some(
            (r) => r.status === "MOVING" && r.targetStationId === nextStation.id
          );

          if (nextStation.status === "EMPTY" && !nextStation.rackId && !isNextTargeted) {
            // Move forward
            this.startRackMovement(rack, station, nextStation, nextStation.id);
            stateChanged = true;
          } else {
            // Next station is occupied -> Station is BLOCKED!
            station.status = "BLOCKED";
            rack.status = "BLOCKED";
            stateChanged = true;
            this.recordEvent(
              "RACK_BLOCKED",
              rack.id,
              station.id,
              `${rack.id} is blocked at ${station.id}; awaiting clearance at ${nextStation.id}`
            );
          }
        }
      } else if (station.status === "BLOCKED" && station.rackId) {
        // Check if condition resolved
        const nextStation = this.stations[i + 1];
        const isNextTargeted = Object.values(this.racks).some(
          (r) => r.status === "MOVING" && r.targetStationId === nextStation?.id
        );
        if (nextStation && nextStation.status === "EMPTY" && !nextStation.rackId && !isNextTargeted) {
          const rack = this.racks[station.rackId];
          this.startRackMovement(rack, station, nextStation, nextStation.id);
          stateChanged = true;
        }
      }
    }

    // 4. Ingestion from Queue to Station 1
    const station1 = this.stations[0];
    const isStation1Targeted = Object.values(this.racks).some(
      (r) => r.status === "MOVING" && r.targetStationId === station1.id
    );

    if (
      station1.status === "EMPTY" &&
      !station1.rackId &&
      !isStation1Targeted &&
      this.queueRackIds.length > 0
    ) {
      const nextRackId = this.queueRackIds.shift()!;
      const rack = this.racks[nextRackId];
      if (rack) {
        this.startRackMovement(rack, null, station1, station1.id);
        stateChanged = true;
      }
    }

    if (stateChanged) {
      this.notify();
    }
  }

  private startRackMovement(
    rack: Rack,
    fromStation: Station | null,
    toStation: Station | null,
    targetKey: string
  ) {
    if (fromStation) {
      fromStation.rackId = null;
      fromStation.status = "EMPTY";
      fromStation.enteredAt = null;
    }

    rack.status = "MOVING";
    rack.previousStationId = fromStation ? fromStation.id : "QUEUE";
    rack.targetStationId = targetKey;
    rack.moveProgress = 0;

    this.recordEvent(
      "RACK_TRANSIT_START",
      rack.id,
      fromStation?.id,
      `${rack.id} initiated automated transfer: ${rack.previousStationId} ➔ ${targetKey}`
    );
  }

  private handleRackArrival(rack: Rack) {
    const targetKey = rack.targetStationId;
    const now = Date.now();
    const effectiveDurationSec = this.config.isDemoMode
      ? this.config.demoDurationSeconds
      : this.config.baseStationDurationSeconds;

    if (targetKey === "COMPLETED") {
      rack.status = "COMPLETED";
      rack.currentStationId = null;
      rack.targetStationId = null;
      rack.moveProgress = 1;
      rack.completedTimestamp = now;
      if (!rack.completedStations.includes("STATION-5")) {
        rack.completedStations.push("STATION-5");
      }
      this.completedRackIds.unshift(rack.id);
      this.recordEvent(
        "RACK_COMPLETED_LINE",
        rack.id,
        "COMPLETED",
        `Rack ${rack.id} passed final QA validation and exited to Completed Storage!`
      );
    } else {
      const targetStation = this.stations.find((s) => s.id === targetKey);
      if (targetStation) {
        rack.status = "RUNNING";
        rack.currentStationId = targetStation.id;
        rack.targetStationId = null;
        rack.moveProgress = 1;
        rack.enteredStationAt = now;

        if (rack.previousStationId && rack.previousStationId.startsWith("STATION-")) {
          if (!rack.completedStations.includes(rack.previousStationId)) {
            rack.completedStations.push(rack.previousStationId);
          }
        }

        targetStation.rackId = rack.id;
        targetStation.status = "RUNNING";
        targetStation.enteredAt = now;
        targetStation.durationSeconds = effectiveDurationSec;

        this.recordEvent(
          "RACK_ENTERED",
          rack.id,
          targetStation.id,
          `${rack.id} docked into ${targetStation.name} (Timer: ${Math.floor(effectiveDurationSec / 60)}m)`
        );
      }
    }
  }

  private recordEvent(
    type: ProductionEvent["type"],
    rackId: string,
    stationId?: string,
    message: string = ""
  ) {
    const event: ProductionEvent = {
      id: `EVT-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      type,
      rackId,
      stationId,
      message,
    };
    this.events.unshift(event);
    if (this.events.length > 50) {
      this.events.pop();
    }
  }

  private computeMetrics(): AssemblyMetrics {
    const runningCount = this.stations.filter((s) => s.status === "RUNNING").length;
    const emptyCount = this.stations.filter((s) => s.status === "EMPTY").length;
    const blockedCount = this.stations.filter((s) => s.status === "BLOCKED").length;

    const activeRacks = Object.values(this.racks).filter(
      (r) => r.status === "RUNNING" || r.status === "MOVING" || r.status === "READY" || r.status === "BLOCKED"
    ).length;

    const bottleneck = this.stations.find((s) => s.status === "BLOCKED");

    return {
      activeRacks,
      stationsRunning: runningCount,
      emptyStations: emptyCount,
      completedToday: 12 + this.completedRackIds.length - 1, // simulated baseline + current session
      averageCycleTimeMinutes: 12.0,
      queueCount: this.queueRackIds.length,
      systemHealth: blockedCount > 0 ? "BLOCKED" : runningCount >= 4 ? "OPTIMAL" : "ATTENTION",
      bottleneckStationId: bottleneck ? bottleneck.id : null,
    };
  }

  public getSnapshot(): AssemblySnapshot {
    return {
      stations: [...this.stations],
      racks: { ...this.racks },
      queueRackIds: [...this.queueRackIds],
      completedRackIds: [...this.completedRackIds],
      metrics: this.computeMetrics(),
      events: [...this.events],
      config: { ...this.config },
      selectedStationId: this.selectedStationId,
      selectedRackId: this.selectedRackId,
    };
  }

  public subscribe(listener: (snapshot: AssemblySnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

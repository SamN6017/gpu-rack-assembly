import { create } from "zustand";
import {
  AssemblyConfig,
  AssemblyMetrics,
  AssemblySnapshot,
  ProductionEvent,
  SimulationSpeed,
} from "@/types/assembly";
import { Rack } from "@/types/rack";
import { Station } from "@/types/station";
import { MockAssemblyDataProvider } from "@/services/mockAssemblyProvider";

export type ViewMode = "WALK" | "OVERVIEW";
export type ActiveModal = "NONE" | "KANBAN" | "STATION" | "RACK" | "ADD_RACK" | "HELP";

export interface InteractablePrompt {
  label: string;
  actionKey: "E";
  targetType: "STATION" | "RACK" | "KANBAN" | "QUEUE_TERMINAL";
  targetId?: string;
}

interface AssemblyState {
  // Core Line State
  stations: Station[];
  racks: Record<string, Rack>;
  queueRackIds: string[];
  completedRackIds: string[];
  metrics: AssemblyMetrics;
  events: ProductionEvent[];
  config: AssemblyConfig;

  // Exploration & Camera State
  viewMode: ViewMode;
  hasEnteredFactory: boolean;
  playerPos: [number, number, number]; // [x, y, z] in 3D world
  activePrompt: InteractablePrompt | null;
  activeModal: ActiveModal;
  inspectedStationId: string | null;
  inspectedRackId: string | null;
  selectedStationId: string | null;
  selectedRackId: string | null;
  cameraPreset: "Overview" | "Station 1" | "Station 2" | "Station 3" | "Station 4" | "Station 5" | "Queue" | "Completed" | "Kanban";

  // Actions
  initialize: () => void;
  enterFactory: () => void;
  setViewMode: (mode: ViewMode) => void;
  setPlayerPos: (pos: [number, number, number]) => void;
  setActivePrompt: (prompt: InteractablePrompt | null) => void;
  openModal: (modal: ActiveModal, targetId?: string) => void;
  closeModal: () => void;
  selectStation: (stationId: string | null) => void;
  selectRack: (rackId: string | null) => void;

  // Line & Simulation Actions
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: SimulationSpeed) => void;
  setDemoMode: (isDemo: boolean) => void;
  addRackToQueue: (modelName?: string) => void;
  dispatchNextFromQueue: () => void;
  removeRackFromQueue: (rackId: string) => void;
  advanceStation: (stationId: string) => void;
  toggleStationBlock: (stationId: string) => void;
  stressTestRack: (rackId: string) => void;
  resetSimulation: () => void;
  setCameraPreset: (preset: "Overview" | "Station 1" | "Station 2" | "Station 3" | "Station 4" | "Station 5" | "Queue" | "Completed" | "Kanban") => void;
}

let activeProvider: MockAssemblyDataProvider | null = null;

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  stations: [],
  racks: {},
  queueRackIds: [],
  completedRackIds: [],
  metrics: {
    activeRacks: 0,
    stationsRunning: 0,
    emptyStations: 0,
    completedToday: 0,
    averageCycleTimeMinutes: 12,
    queueCount: 0,
    systemHealth: "OPTIMAL",
    bottleneckStationId: null,
  },
  events: [],
  config: {
    baseStationDurationSeconds: 720,
    demoDurationSeconds: 12,
    isDemoMode: false,
    speedMultiplier: 1,
    isPaused: false,
    transitionDurationMs: 3000,
  },

  // Exploration defaults
  viewMode: "WALK",
  hasEnteredFactory: false,
  playerPos: [0, 1.7, 10], // Player starts near facility entrance walkway facing assembly line
  activePrompt: null,
  activeModal: "NONE",
  inspectedStationId: null,
  inspectedRackId: null,
  selectedStationId: null,
  selectedRackId: null,
  cameraPreset: "Overview",

  initialize: () => {
    if (activeProvider) return;
    activeProvider = new MockAssemblyDataProvider();
    activeProvider.subscribe((snapshot: AssemblySnapshot) => {
      set({
        stations: snapshot.stations,
        racks: snapshot.racks,
        queueRackIds: snapshot.queueRackIds,
        completedRackIds: snapshot.completedRackIds,
        metrics: snapshot.metrics,
        events: snapshot.events,
        config: snapshot.config,
      });
    });
  },

  enterFactory: () => {
    set({ hasEnteredFactory: true, viewMode: "WALK" });
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setPlayerPos: (pos: [number, number, number]) => {
    set({ playerPos: pos });
  },

  setActivePrompt: (prompt: InteractablePrompt | null) => {
    set({ activePrompt: prompt });
  },

  openModal: (modal: ActiveModal, targetId?: string) => {
    if (modal === "STATION") {
      set({ activeModal: modal, inspectedStationId: targetId || null });
    } else if (modal === "RACK") {
      set({ activeModal: modal, inspectedRackId: targetId || null });
    } else {
      set({ activeModal: modal });
    }
  },

  closeModal: () => {
    set({
      activeModal: "NONE",
      inspectedStationId: null,
      inspectedRackId: null,
      selectedStationId: null,
      selectedRackId: null,
    });
  },

  selectStation: (stationId: string | null) => {
    set({
      selectedStationId: stationId,
      inspectedStationId: stationId,
      activeModal: stationId ? "STATION" : "NONE",
    });
  },

  selectRack: (rackId: string | null) => {
    set({
      selectedRackId: rackId,
      inspectedRackId: rackId,
      activeModal: rackId ? "RACK" : "NONE",
    });
  },

  setPaused: (paused: boolean) => {
    if (activeProvider) activeProvider.setPaused(paused);
  },

  setSpeed: (speed: SimulationSpeed) => {
    if (activeProvider) activeProvider.setSpeed(speed);
  },

  setDemoMode: (isDemo: boolean) => {
    if (activeProvider) activeProvider.setDemoMode(isDemo);
  },

  addRackToQueue: (modelName?: string) => {
    if (activeProvider) activeProvider.addRackToQueue(modelName);
  },

  dispatchNextFromQueue: () => {
    if (activeProvider) activeProvider.dispatchNextFromQueue();
  },

  removeRackFromQueue: (rackId: string) => {
    if (activeProvider) activeProvider.removeRackFromQueue(rackId);
  },

  advanceStation: (stationId: string) => {
    if (activeProvider) activeProvider.advanceStation(stationId);
  },

  toggleStationBlock: (stationId: string) => {
    if (activeProvider) activeProvider.toggleStationBlock(stationId);
  },

  stressTestRack: (rackId: string) => {
    if (activeProvider) activeProvider.stressTestRack(rackId);
  },

  resetSimulation: () => {
    if (activeProvider) {
      activeProvider.resetSimulation();
      set({ activeModal: "NONE", inspectedStationId: null, inspectedRackId: null });
    }
  },

  setCameraPreset: (preset) => {
    set({ cameraPreset: preset });
    if (preset.startsWith("Station ")) {
      const num = preset.split(" ")[1];
      set({ inspectedStationId: `STATION-${num}` });
    }
  },
}));

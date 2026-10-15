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
import { IAssemblyDataProvider } from "@/services/assemblyDataProvider";
import { SimulationAssemblyProvider } from "@/services/simulationAssemblyProvider";
import { RealtimeAssemblyProvider } from "@/services/realtimeAssemblyProvider";
import { MockLiveAdapter } from "@/services/adapters/mockLiveAdapter";

export type ViewMode = "WALK" | "OVERVIEW";
export type ActiveModal = "NONE" | "KANBAN" | "STATION" | "RACK" | "ADD_RACK" | "HELP";

export interface InteractablePrompt {
  label: string;
  actionKey: "E";
  targetType: "STATION" | "RACK" | "KANBAN" | "QUEUE_TERMINAL";
  targetId?: string;
}

interface AssemblyState {
  mode: "SIMULATION" | "LIVE" | "REPLAY" | "LEGACY_DEMO";
  virtualTime?: number;
  readOnly: boolean;
  manufacturing?: import("@/simulation/core/types").Snapshot;
  manufacturingConfig?: import("@/simulation/core/types").SimulationConfig;
  useProvider: (provider: IAssemblyDataProvider) => void;
  useLegacyDemo: () => void;
  dispose: () => void;
  stepEvent: () => void;
  stepMinute: () => void;
  jumpTo: (time: number) => void;
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
  setOperatingMode: (mode: "SIMULATION" | "LIVE") => void;
}

let activeProvider: IAssemblyDataProvider | null = null;
let unsubscribe: (() => void) | null = null;

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  mode: "SIMULATION", readOnly: true,
  setOperatingMode: (targetMode) => {
    if (targetMode === "LIVE") {
      const s = get();
      const initialSnapshot: AssemblySnapshot = {
        mode: "LIVE",
        virtualTime: s.virtualTime ?? Date.now(),
        readOnly: true,
        manufacturing: s.manufacturing,
        manufacturingConfig: s.manufacturingConfig,
        stations: s.stations,
        racks: s.racks,
        queueRackIds: s.queueRackIds,
        completedRackIds: s.completedRackIds,
        metrics: s.metrics,
        events: s.events,
        config: s.config,
        selectedStationId: s.selectedStationId,
        selectedRackId: s.selectedRackId,
      };
      get().useProvider(new RealtimeAssemblyProvider(new MockLiveAdapter(), initialSnapshot));
    } else {
      get().useProvider(new SimulationAssemblyProvider());
    }
  },
  useProvider: (provider) => {
    unsubscribe?.(); activeProvider?.destroy(); activeProvider=provider;
    const apply=(snapshot:AssemblySnapshot)=>set({stations:snapshot.stations,racks:snapshot.racks,queueRackIds:snapshot.queueRackIds,completedRackIds:snapshot.completedRackIds,metrics:snapshot.metrics,events:snapshot.events,config:snapshot.config,mode:snapshot.mode||"LEGACY_DEMO",virtualTime:snapshot.virtualTime,readOnly:snapshot.readOnly??false,manufacturing:snapshot.manufacturing,manufacturingConfig:snapshot.manufacturingConfig});
    unsubscribe=provider.subscribe(apply);
    void provider.initialize().then(snapshot=>{if(activeProvider===provider)apply(snapshot);}).catch(()=>{if(activeProvider===provider)set({readOnly:true});});
  },
  useLegacyDemo: () => get().useProvider(new MockAssemblyDataProvider()),
  dispose: () => {unsubscribe?.();activeProvider?.destroy();unsubscribe=null;activeProvider=null;},
  stepEvent: () => {const p=activeProvider as IAssemblyDataProvider & {stepEvent?:()=>void};p?.stepEvent?.();},
  stepMinute: () => {const p=activeProvider as IAssemblyDataProvider & {stepMinute?:()=>void};p?.stepMinute?.();},
  jumpTo: (time) => {const p=activeProvider as IAssemblyDataProvider & {jumpTo?:(t:number)=>void};p?.jumpTo?.(time);},
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

  initialize: () => {if(!activeProvider)get().useProvider(new SimulationAssemblyProvider());},

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

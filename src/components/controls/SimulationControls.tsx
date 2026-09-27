"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import { SimulationSpeed } from "@/types/assembly";
import {
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Zap,
  Camera,
  Sparkles,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

export function SimulationControls() {
  const config = useAssemblyStore((s) => s.config);
  const setPaused = useAssemblyStore((s) => s.setPaused);
  const setSpeed = useAssemblyStore((s) => s.setSpeed);
  const setDemoMode = useAssemblyStore((s) => s.setDemoMode);
  const resetSimulation = useAssemblyStore((s) => s.resetSimulation);
  const addRackToQueue = useAssemblyStore((s) => s.addRackToQueue);
  const dispatchNextFromQueue = useAssemblyStore((s) => s.dispatchNextFromQueue);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const cameraPreset = useAssemblyStore((s) => s.cameraPreset);
  const setCameraPreset = useAssemblyStore((s) => s.setCameraPreset);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const speedOptions: SimulationSpeed[] = [1, 2, 5, 10];
  const cameraOptions = [
    { label: "Overview", value: "Overview" },
    { label: "Queue Bay", value: "Queue" },
    { label: "Stn 1", value: "Station 1" },
    { label: "Stn 2", value: "Station 2" },
    { label: "Stn 3", value: "Station 3" },
    { label: "Stn 4", value: "Station 4" },
    { label: "Stn 5", value: "Station 5" },
    { label: "Completed", value: "Completed" },
  ] as const;

  const gpuModels = [
    "NVIDIA GB200 NVL72",
    "NVIDIA H100 Supercluster",
    "NVIDIA B200 Dual-Node",
    "AMD Instinct MI300X OAM",
  ];

  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 pointer-events-none">
      {/* Simulation Master Controller Card */}
      <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-3 shadow-2xl flex flex-wrap items-center gap-2.5 font-mono text-xs">
        {/* Play / Pause */}
        <button
          onClick={() => setPaused(!config.isPaused)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shadow-md ${
            config.isPaused
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-amber-600 hover:bg-amber-500 text-white"
          }`}
          title={config.isPaused ? "Resume simulation" : "Pause simulation"}
        >
          {config.isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={() => resetSimulation()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-700/60 transition"
          title="Reset to Acceptance Scenario initial state"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        {/* Dispatch Next from Queue Button */}
        <button
          onClick={() => dispatchNextFromQueue()}
          disabled={queueRackIds.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800 text-white font-semibold shadow transition"
          title="Push next rack from Queue into Station 1"
        >
          <span>DISPATCH QUEUE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {/* Add Rack to Queue with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 transition"
            title="Enqueue new GPU rack into line"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ QUEUE RACK</span>
            <ChevronDown className="w-3 h-3 text-purple-400" />
          </button>

          {showAddMenu && (
            <div className="absolute top-full left-0 mt-1.5 w-56 bg-slate-950 border border-purple-500/80 p-2 rounded-xl shadow-2xl backdrop-blur-md z-50 space-y-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
                Choose Model Architecture:
              </div>
              {gpuModels.map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    addRackToQueue(model);
                    setShowAddMenu(false);
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-purple-950/80 text-xs text-slate-200 hover:text-purple-300 transition"
                >
                  {model}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Speed Controls */}
        <div className="h-4 w-px bg-slate-800" />
        <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <span className="text-[10px] text-slate-500 px-1 font-semibold flex items-center">
            <Zap className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
          </span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeed(speed)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                config.speedMultiplier === speed && !config.isDemoMode
                  ? "bg-sky-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Demo Mode Toggle (12 sec vs 12 min) */}
        <button
          onClick={() => setDemoMode(!config.isDemoMode)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition text-[11px] font-semibold ${
            config.isDemoMode
              ? "bg-purple-950/80 border-purple-500/70 text-purple-300 ring-1 ring-purple-500/50"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Demo Mode: 12 seconds per station for rapid testing"
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>DEMO (12s)</span>
        </button>
      </div>

      {/* Camera Presets Toolbar */}
      <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-2 shadow-2xl flex items-center space-x-1 font-mono text-xs max-w-fit">
        <span className="text-[10px] text-slate-500 px-1.5 flex items-center gap-1 font-semibold">
          <Camera className="w-3 h-3 text-slate-400" />
          CAM:
        </span>
        {cameraOptions.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setCameraPreset(preset.value as any)}
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
              cameraPreset === preset.value
                ? "bg-sky-950 text-sky-400 font-bold border border-sky-800/60 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

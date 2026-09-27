"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  Compass,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Eye,
  Footprints,
  Kanban,
  Maximize2,
} from "lucide-react";

export function FactoryHUD() {
  const viewMode = useAssemblyStore((s) => s.viewMode);
  const setViewMode = useAssemblyStore((s) => s.setViewMode);
  const activePrompt = useAssemblyStore((s) => s.activePrompt);
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const openModal = useAssemblyStore((s) => s.openModal);
  const config = useAssemblyStore((s) => s.config);
  const setPaused = useAssemblyStore((s) => s.setPaused);
  const setDemoMode = useAssemblyStore((s) => s.setDemoMode);
  const resetSimulation = useAssemblyStore((s) => s.resetSimulation);
  const playerPos = useAssemblyStore((s) => s.playerPos);

  const [showMinimap, setShowMinimap] = useState(true);

  // Normalize player position to 0-100% for the minimap
  // Factory bounds: X from -36 to 36 (width 72), Z from -16 to 16 (depth 32)
  const normX = Math.min(94, Math.max(6, ((playerPos[0] + 36) / 72) * 100));
  const normZ = Math.min(94, Math.max(6, ((playerPos[2] + 16) / 32) * 100));

  if (activeModal !== "NONE") return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 font-mono">
      {/* 1. Center Crosshair (for First-Person Walk Mode) */}
      {viewMode === "WALK" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow ring-1 ring-black/40" />
        </div>
      )}

      {/* 2. Interactive Proximity Action Banner ([E] Prompt) */}
      {activePrompt && (
        <div className="absolute bottom-20 inset-x-0 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="bg-slate-950/90 border border-sky-400/80 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 text-white">
            <span className="px-2 py-0.5 rounded bg-sky-500 text-slate-950 font-bold text-xs shadow">
              {activePrompt.actionKey}
            </span>
            <span className="text-sm font-semibold tracking-wide text-sky-200">
              {activePrompt.label}
            </span>
          </div>
        </div>
      )}

      {/* 3. Top-Left Minimalist Control Chip */}
      <div className="absolute top-4 left-4 pointer-events-auto flex items-center space-x-2">
        {/* Walk vs Overview Mode Switcher */}
        <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-xl backdrop-blur-md flex items-center space-x-1">
          <button
            onClick={() => setViewMode("WALK")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "WALK"
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="First-person walk mode (WASD + Mouse)"
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>WALK</span>
          </button>
          <button
            onClick={() => setViewMode("OVERVIEW")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "OVERVIEW"
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Elevated factory overview (Orbit/Zoom/Pan)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>OVERVIEW</span>
          </button>
        </div>

        {/* Quick Simulation Controls */}
        <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-xl backdrop-blur-md flex items-center space-x-1 text-xs">
          <button
            onClick={() => setPaused(!config.isPaused)}
            className={`p-1.5 rounded-lg transition ${
              config.isPaused ? "text-emerald-400 hover:bg-slate-800" : "text-amber-400 hover:bg-slate-800"
            }`}
            title={config.isPaused ? "Resume simulation" : "Pause simulation"}
          >
            {config.isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
          </button>

          <button
            onClick={() => setDemoMode(!config.isDemoMode)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition flex items-center gap-1 ${
              config.isDemoMode
                ? "bg-purple-950/80 border-purple-500 text-purple-300 ring-1 ring-purple-500/40"
                : "border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
            title="Toggle Demo Mode: 12 seconds per station vs 12 minutes"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{config.isDemoMode ? "DEMO 12s" : "PROD 12m"}</span>
          </button>

          <button
            onClick={() => resetSimulation()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Reset simulation to initial acceptance state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Open Kanban Shortcut */}
        <button
          onClick={() => openModal("KANBAN")}
          className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 px-3 py-2 rounded-xl shadow-xl backdrop-blur-md text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          title="Open Central Kanban Operations Board"
        >
          <Kanban className="w-3.5 h-3.5 text-sky-400" />
          <span>KANBAN</span>
        </button>
      </div>

      {/* 4. Top-Right Minimalist Factory Minimap */}
      <div className="absolute top-4 right-4 pointer-events-auto flex flex-col items-end space-y-1.5">
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-2.5 shadow-2xl backdrop-blur-md text-[10px]">
          <div className="flex items-center justify-between text-slate-400 font-bold mb-1.5 px-0.5">
            <span className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-sky-400" />
              FACILITY MAP
            </span>
            <span className="text-[9px] text-slate-500 font-normal">
              {viewMode === "WALK" ? "WASD" : "ORBIT"}
            </span>
          </div>

          {/* Minimap Radar Canvas Container */}
          <div className="relative w-44 h-24 bg-[#0a0f1d] border border-slate-800 rounded-lg overflow-hidden">
            {/* North Kanban Board Indicator */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800 text-[8px] font-bold text-sky-300">
              KANBAN
            </div>

            {/* Central Assembly Line Stations (1 to 5) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5">
              <span className="w-3.5 h-3 rounded bg-purple-900/60 border border-purple-700/80 text-[7px] text-center text-purple-300">
                Q
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className="w-3.5 h-3 rounded bg-slate-800 border border-slate-700 text-[7px] text-center text-slate-300"
                >
                  {n}
                </span>
              ))}
              <span className="w-3.5 h-3 rounded bg-emerald-900/60 border border-emerald-700/80 text-[7px] text-center text-emerald-300">
                ✓
              </span>
            </div>

            {/* Player Marker ▲ */}
            <div
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
              style={{ left: `${normX}%`, top: `${normZ}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white shadow-lg animate-pulse" />
            </div>
          </div>
        </div>

        {/* Walk Controls Helper Pill */}
        {viewMode === "WALK" && (
          <div className="bg-slate-950/70 border border-slate-800/80 px-2.5 py-1 rounded-full text-[10px] text-slate-400 backdrop-blur-sm">
            WASD: Walk • Mouse: Look • [E]: Interact • ESC: Release Mouse
          </div>
        )}
      </div>
    </div>
  );
}

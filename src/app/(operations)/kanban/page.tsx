"use client";

import React, { useState } from "react";
import { VirtualKanbanDashboard } from "@/components/kanban/VirtualKanbanDashboard";
import { RunWorkspace } from "@/components/operations/RunWorkspace";

export default function Page() {
  const [mode, setMode] = useState<"live-twin" | "historical-runs">("live-twin");

  return (
    <div className="min-h-screen bg-[#070b14]">
      {/* View Switcher Top Bar */}
      <div className="bg-[#0b101d] border-b border-slate-800 px-6 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Kanban Source:</span>
          <button
            onClick={() => setMode("live-twin")}
            className={`px-3 py-1 rounded transition-colors ${
              mode === "live-twin"
                ? "bg-cyan-600 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Digital Twin (Live Simulation)
          </button>
          <button
            onClick={() => setMode("historical-runs")}
            className={`px-3 py-1 rounded transition-colors ${
              mode === "historical-runs"
                ? "bg-cyan-600 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Database Historical Runs
          </button>
        </div>
      </div>

      {mode === "live-twin" ? (
        <VirtualKanbanDashboard />
      ) : (
        <div className="p-6">
          <RunWorkspace view="kanban" />
        </div>
      )}
    </div>
  );
}

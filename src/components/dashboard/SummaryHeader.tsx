"use client";

import React from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  Inbox,
  AlertTriangle,
  Radio,
  Server,
} from "lucide-react";

export function SummaryHeader() {
  const metrics = useAssemblyStore((s) => s.metrics);
  const config = useAssemblyStore((s) => s.config);

  return (
    <header className="h-16 bg-[#0a0f1d] border-b border-slate-800/80 px-5 flex items-center justify-between z-20 shrink-0">
      {/* Brand & Digital Twin Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-sm text-slate-100 tracking-wide font-mono">
                GPU RACK ASSEMBLY LINE
              </h1>
              <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded font-mono border border-sky-800/50">
                DIGITAL TWIN v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              REAL-TIME SYNCHRONIZED
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                {config.isDemoMode ? "DEMO MODE (12s/stn)" : "PRODUCTION MODE (12m/stn)"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Production KPIs Bar (Section 11) */}
      <div className="hidden xl:flex items-center space-x-6 text-xs font-mono">
        {/* Active Racks */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Activity className="w-4 h-4 text-sky-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Racks</div>
            <div className="text-sm font-bold text-slate-100">{metrics.activeRacks}</div>
          </div>
        </div>

        {/* Stations Running */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Layers className="w-4 h-4 text-indigo-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Running Stations</div>
            <div className="text-sm font-bold text-slate-100">{metrics.stationsRunning} / 5</div>
          </div>
        </div>

        {/* Empty Stations */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Empty Stations</div>
            <div className="text-sm font-bold text-slate-300">{metrics.emptyStations}</div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Completed Today</div>
            <div className="text-sm font-bold text-emerald-400">{metrics.completedToday}</div>
          </div>
        </div>

        {/* Average Cycle Time */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Cycle Time</div>
            <div className="text-sm font-bold text-slate-100">
              {config.isDemoMode ? "12 sec" : `${metrics.averageCycleTimeMinutes} min`}
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="flex items-center space-x-2.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Inbox className="w-4 h-4 text-purple-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Queue</div>
            <div className="text-sm font-bold text-purple-300">{metrics.queueCount} racks</div>
          </div>
        </div>

        {/* Line Health */}
        <div className="flex items-center space-x-2 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          {metrics.systemHealth === "BLOCKED" ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              <div>
                <div className="text-[10px] text-rose-400 uppercase tracking-wider">Line Status</div>
                <div className="text-xs font-bold text-rose-300">BLOCKED</div>
              </div>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Line Status</div>
                <div className="text-xs font-bold text-emerald-300">NOMINAL</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Connectivity Layer Badge */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/60 text-slate-300 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          AssemblyDataProvider (Active)
        </span>
      </div>
    </header>
  );
}

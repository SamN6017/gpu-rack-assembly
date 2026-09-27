"use client";

import React from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  Footprints,
  Eye,
  Server,
  Kanban,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function EnterFactoryScreen() {
  const hasEnteredFactory = useAssemblyStore((s) => s.hasEnteredFactory);
  const enterFactory = useAssemblyStore((s) => s.enterFactory);
  const setViewMode = useAssemblyStore((s) => s.setViewMode);

  if (hasEnteredFactory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-mono">
      <div className="bg-[#0b1120] border border-sky-500/50 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Facility Badge */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/25 border border-sky-400/40">
            <Server className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            GPU RACK ASSEMBLY FACILITY
          </h1>
          <p className="text-xs sm:text-sm text-sky-400 font-semibold">
            Interactive 3D Digital Twin • Autonomous Manufacturing Cell
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto pt-1 font-sans">
            Explore the active GPU server assembly line in first-person 3D. Inspect stations, watch
            automated rack transfers, and consult the central physical Kanban operations board.
          </p>
        </div>

        {/* Walk Controls Cheat Sheet (Requirement 21) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-left space-y-2.5">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold border-b border-slate-800 pb-1">
            Personnel Navigation Guide:
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded bg-slate-850 border border-slate-700 font-bold text-white text-[11px]">
                W A S D
              </span>
              <span className="text-slate-300">Walk & Strafe</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded bg-slate-850 border border-slate-700 font-bold text-white text-[11px]">
                Mouse
              </span>
              <span className="text-slate-300">Look Around</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded bg-sky-950 border border-sky-700 font-bold text-sky-300 text-[11px]">
                [E]
              </span>
              <span className="text-slate-300">Interact / Inspect</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 rounded bg-slate-850 border border-slate-700 font-bold text-white text-[11px]">
                ESC
              </span>
              <span className="text-slate-300">Release Pointer</span>
            </div>
          </div>
        </div>

        {/* Enter Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => enterFactory()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/20 transition group"
          >
            <Footprints className="w-5 h-5" />
            <span>ENTER FACTORY (FIRST-PERSON POV)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </button>

          <button
            onClick={() => {
              enterFactory();
              setViewMode("OVERVIEW");
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>Start in Aerial Overview Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
}

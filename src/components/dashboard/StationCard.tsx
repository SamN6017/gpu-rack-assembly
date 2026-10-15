"use client";

import React from "react";
import { Station } from "@/types/station";
import { Rack } from "@/types/rack";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  Clock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  Eye,
  ChevronRight,
  FastForward,
} from "lucide-react";

interface StationCardProps {
  station: Station;
  rack: Rack | null;
}

export function StationCard({ station, rack }: StationCardProps) {
  const selectedStationId = useAssemblyStore((s) => s.selectedStationId);
  const selectStation = useAssemblyStore((s) => s.selectStation);
  const selectRack = useAssemblyStore((s) => s.selectRack);
  const advanceStation = useAssemblyStore((s) => s.advanceStation);
  const toggleStationBlock = useAssemblyStore((s) => s.toggleStationBlock);
  const setCameraPreset = useAssemblyStore((s) => s.setCameraPreset);
  const isSelected = selectedStationId === station.id;

  // Calculate timer & progress
  let remainingText = "Awaiting rack";
  let progressPct = 0;

  if (station.rackId && rack && station.enteredAt) {
    const elapsedSec = Math.max(0, ((useAssemblyStore.getState().virtualTime ?? Date.now()) - station.enteredAt) / 1000);
    const duration = station.durationSeconds || 720;
    const remainingSec = Math.max(0, duration - elapsedSec);
    progressPct = Math.min(100, Math.round((elapsedSec / duration) * 100));

    const mins = Math.floor(remainingSec / 60);
    const secs = Math.floor(remainingSec % 60);
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (station.status === "RUNNING") {
      remainingText = `${formatted} remaining`;
    } else if (station.status === "COMPLETE") {
      remainingText = "00:00 - READY TO MOVE";
      progressPct = 100;
    } else if (station.status === "BLOCKED") {
      remainingText = "BLOCKED (Downstream Busy)";
      progressPct = 100;
    }
  }

  const statusBadge = {
    RUNNING: {
      bg: "bg-sky-500/15 border-sky-500/40 text-sky-400",
      icon: <Play className="w-3 h-3 fill-current" />,
      bar: "bg-sky-500",
    },
    COMPLETE: {
      bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
      icon: <CheckCircle2 className="w-3 h-3" />,
      bar: "bg-emerald-500",
    },
    BLOCKED: {
      bg: "bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse",
      icon: <AlertTriangle className="w-3 h-3" />,
      bar: "bg-rose-500",
    },
    EMPTY: {
      bg: "bg-slate-800/80 border-slate-700/60 text-slate-400",
      icon: <Clock className="w-3 h-3 text-slate-500" />,
      bar: "bg-slate-700",
    },
  }[station.status];

  return (
    <div
      onClick={() => {
        selectStation(station.id);
        const presetName = `Station ${station.number}` as any;
        setCameraPreset(presetName);
      }}
      className={`relative rounded-xl border p-3.5 transition-all duration-200 cursor-pointer text-left font-mono ${
        isSelected
          ? "bg-slate-900/95 border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/40"
          : "bg-[#0f1626]/85 border-slate-800 hover:border-slate-700 hover:bg-[#121b2f]"
      }`}
    >
      {/* Top Station Meta */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-sky-400">
            STATION {station.number}
          </span>
          <h3 className="font-semibold text-xs text-slate-200 truncate max-w-[170px]">
            {station.name}
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusBadge.bg}`}
        >
          {statusBadge.icon}
          {station.status}
        </span>
      </div>

      <p className="text-[11px] text-slate-400 font-sans mb-3 line-clamp-1">
        {station.processDescription}
      </p>

      {/* Docked Rack or Empty State */}
      {station.rackId && rack ? (
        <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/80 mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectRack(rack.id);
              }}
              className="flex items-center space-x-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 hover:underline"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>{rack.id}</span>
              <Eye className="w-3 h-3 text-slate-500" />
            </button>
            <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
              {rack.modelName}
            </span>
          </div>

          {/* Progress Bar & Timer */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">{progressPct}%</span>
              <span
                className={`font-semibold ${
                  station.status === "BLOCKED"
                    ? "text-rose-400"
                    : station.status === "COMPLETE"
                    ? "text-emerald-400"
                    : "text-slate-300"
                }`}
              >
                {remainingText}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${statusBadge.bar}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950/40 rounded-lg p-3 border border-dashed border-slate-800 mb-2.5 text-center">
          <span className="text-[11px] text-slate-500 italic">EMPTY • Waiting for incoming rack</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        {station.rackId ? (
          <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => advanceStation(station.id)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-semibold transition shadow-sm"
              title="Fast-forward and advance rack"
            >
              <FastForward className="w-2.5 h-2.5" />
              <span>Advance</span>
            </button>
            <button
              onClick={() => toggleStationBlock(station.id)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                station.status === "BLOCKED"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                  : "bg-slate-900 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border-slate-800 hover:border-rose-700"
              }`}
              title="Toggle station maintenance blockage"
            >
              {station.status === "BLOCKED" ? "Unblock" : "Simulate Block"}
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 italic">Target: 12m standard cycle</span>
        )}
        <span className="text-sky-400 flex items-center text-[10px] hover:underline">
          View in 3D <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

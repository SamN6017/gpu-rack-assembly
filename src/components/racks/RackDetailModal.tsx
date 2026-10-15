"use client";

import React from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  X,
  Cpu,
  Zap,
  Thermometer,
  Weight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Barcode,
  Navigation,
} from "lucide-react";

export function RackDetailModal() {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const inspectedRackId = useAssemblyStore((s) => s.inspectedRackId);
  const closeModal = useAssemblyStore((s) => s.closeModal);
  const racks = useAssemblyStore((s) => s.racks);
  const stations = useAssemblyStore((s) => s.stations);
  const setCameraPreset = useAssemblyStore((s) => s.setCameraPreset);
  const stressTestRack = useAssemblyStore((s) => s.stressTestRack);
  const advanceStation = useAssemblyStore((s) => s.advanceStation);

  if (activeModal !== "RACK" || !inspectedRackId || !racks[inspectedRackId]) {
    return null;
  }

  const rack = racks[inspectedRackId];
  const stationObj = stations.find((s) => s.id === rack.currentStationId);

  // Compute progress if in station
  let progressPct = 0;
  let remainingText = "N/A";
  if (stationObj && stationObj.enteredAt) {
    const elapsedSec = Math.max(0, ((useAssemblyStore.getState().virtualTime ?? Date.now()) - stationObj.enteredAt) / 1000);
    const duration = stationObj.durationSeconds || 720;
    progressPct = Math.min(100, Math.round((elapsedSec / duration) * 100));
    const rem = Math.max(0, duration - elapsedSec);
    remainingText = `${Math.floor(rem / 60)}m ${Math.floor(rem % 60)}s`;
  }

  const allStations = [
    { id: "STATION-1", name: "Station 1: Chassis & Busbar" },
    { id: "STATION-2", name: "Station 2: Liquid Cold-Plate & Trays" },
    { id: "STATION-3", name: "Station 3: Power & Switch Sleds" },
    { id: "STATION-4", name: "Station 4: Optical Loom Harness" },
    { id: "STATION-5", name: "Station 5: Automated QA & Soak" },
  ];

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none font-mono">
      <div className="bg-[#0c121e] border border-sky-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0f1728] border-b border-slate-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-500/40 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wider">{rack.id}</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border bg-sky-500/10 border-sky-500/30 text-sky-400">
                  {rack.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{rack.modelName}</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Current Location & Progress */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Station:</span>
              <span className="font-bold text-sky-400">
                {stationObj ? `Station ${stationObj.number} - ${stationObj.name}` : rack.status === "MOVING" ? `In Transit ➔ ${rack.targetStationId}` : rack.status === "QUEUED" ? "Buffer Queue" : "Completed Bay"}
              </span>
            </div>

            {stationObj && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Station Progress:</span>
                  <span className="font-bold text-emerald-400">
                    {progressPct}% ({remainingText} remaining)
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Sequential Quality Station Verification Checklist (Requirement 9) */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Assembly Line Milestone Sign-offs</span>
            </div>

            <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
              {allStations.map((stn) => {
                const isPassed = rack.completedStations.includes(stn.id);
                const isCurrent = rack.currentStationId === stn.id;

                return (
                  <div
                    key={stn.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      isCurrent
                        ? "bg-sky-950/40 border border-sky-800/50 text-sky-300"
                        : isPassed
                        ? "text-emerald-400"
                        : "text-slate-500 opacity-60"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-sky-400 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-dashed border-slate-600" />
                      )}
                      <span>{stn.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold font-mono">
                      {isPassed ? "PASSED" : isCurrent ? "IN PROGRESS" : "PENDING"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Industrial Telemetry Grid */}
          {rack.telemetry && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-sky-400" />
                <span>Manufacturing Hardware Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-sky-400" />
                    GPU Accelerators
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {rack.telemetry.gpuCount}x {rack.telemetry.gpuModel}
                  </div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Power Dissipation
                  </div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">
                    {rack.telemetry.powerKw} kW
                  </div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-rose-400" />
                    Manifold Thermal
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {rack.telemetry.tempCelsius} °C
                  </div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Weight className="w-3 h-3 text-indigo-400" />
                    Rack Wet Weight
                  </div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">
                    {rack.telemetry.weightKg} kg
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#0f1728] border-t border-slate-800 p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              disabled={useAssemblyStore.getState().readOnly}
                  onClick={() => stressTestRack(rack.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/60 rounded-lg text-xs font-semibold shadow transition"
              title="Inject GPU computational load to stress test cooling"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Stress Test GPUs</span>
            </button>

            {stationObj && (
              <button
                onClick={() => {
                  advanceStation(stationObj.id);
                  closeModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition"
                title="Immediately complete current station"
              >
                <span>Advance Station</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {stationObj && (
              <button
                onClick={() => {
                  const presetName = `Station ${stationObj.number}` as any;
                  setCameraPreset(presetName);
                  closeModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow transition"
              >
                <Navigation className="w-3.5 h-3.5 text-sky-400" />
                <span>Track in 3D</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

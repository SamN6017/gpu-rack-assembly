"use client";

import React from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  X,
  Cpu,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  FastForward,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export function StationInspectModal() {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const closeModal = useAssemblyStore((s) => s.closeModal);
  const inspectedStationId = useAssemblyStore((s) => s.inspectedStationId);
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const advanceStation = useAssemblyStore((s) => s.advanceStation);
  const toggleStationBlock = useAssemblyStore((s) => s.toggleStationBlock);
  const openModal = useAssemblyStore((s) => s.openModal);
  const manufacturing = useAssemblyStore((s) => s.manufacturing);
  const manufacturingConfig = useAssemblyStore((s) => s.manufacturingConfig);

  if (activeModal !== "STATION" || !inspectedStationId) return null;

  const station = stations.find((s) => s.id === inspectedStationId);
  if (!station) return null;

  const rack = station.rackId ? racks[station.rackId] : null;

  // Calculate elapsed & remaining
  let remainingText = "Waiting for incoming rack";
  let elapsedText = "00:00";
  let progressPct = 0;

  if (station.rackId && rack && station.enteredAt) {
    const elapsedSec = Math.max(0, ((useAssemblyStore.getState().virtualTime ?? Date.now()) - station.enteredAt) / 1000);
    const duration = station.durationSeconds || 720;
    const remainingSec = Math.max(0, duration - elapsedSec);
    progressPct = Math.min(100, Math.round((elapsedSec / duration) * 100));

    const eMin = Math.floor(elapsedSec / 60);
    const eSec = Math.floor(elapsedSec % 60);
    elapsedText = `${String(eMin).padStart(2, "0")}:${String(eSec).padStart(2, "0")}`;

    const rMin = Math.floor(remainingSec / 60);
    const rSec = Math.floor(remainingSec % 60);
    const formattedRem = `${String(rMin).padStart(2, "0")}:${String(rSec).padStart(2, "0")}`;

    if (station.status === "RUNNING") {
      remainingText = `${formattedRem} remaining`;
    } else if (station.status === "COMPLETE") {
      remainingText = "00:00 - READY TO MOVE";
      progressPct = 100;
    } else if (station.status === "BLOCKED") {
      remainingText = "BLOCKED (Downstream Busy)";
      progressPct = 100;
    }
  }

  const nextStationNumber = station.number < 5 ? station.number + 1 : "Completed Bay";

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm select-none font-mono">
      <div className="bg-[#0c121e] border border-sky-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0f1728] border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="font-bold text-xs bg-sky-950 text-sky-400 px-2.5 py-1 rounded border border-sky-800">
              STATION {station.number}
            </span>
            <h2 className="text-sm font-bold text-slate-100">{station.name}</h2>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 font-sans">{station.processDescription}</p>

          {/* Docked Rack Card */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Docked Rack:</span>
              {rack ? (
                <button
                  onClick={() => openModal("RACK", rack.id)}
                  className="flex items-center space-x-1.5 font-bold text-sky-300 hover:underline text-xs"
                >
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>{rack.id}</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic">EMPTY</span>
              )}
            </div>

            {rack && (
              <>
                <div className="text-[11px] text-slate-400">{rack.modelName}</div>

                {/* Progress Bar & Timers */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">{progressPct}%</span>
                    <span className="text-sky-300 font-bold">{remainingText}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        station.status === "COMPLETE"
                          ? "bg-emerald-500"
                          : station.status === "BLOCKED"
                          ? "bg-rose-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entered Station:</span>
                    <span className="font-bold text-slate-200">{elapsedText} ago</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Next Destination:</span>
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      {typeof nextStationNumber === "number" ? `Station ${nextStationNumber}` : nextStationNumber}
                      <ArrowRight className="w-3 h-3 text-sky-400" />
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Workstation Point-of-Use Inventory & Kanban Status */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Station Inventory & Pull Kanban Rules
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {manufacturingConfig?.materials.filter((m) => m.station === station.number - 1).length || 0} Assigned Parts
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {manufacturingConfig?.materials
                .filter((m) => m.station === station.number - 1)
                .map((m) => {
                  const stock = manufacturing?.stocks.find((s) => s.id === m.id);
                  const onHand = stock?.onHand ?? m.pointOfUse;
                  const reserved = stock?.reserved ?? 0;
                  const isShortage = onHand <= m.safetyStock;
                  const isReplenishing = (stock?.onOrder ?? 0) > 0;
                  const activeOrder = manufacturing?.orders.find((o) => o.materialId === m.id);

                  return (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{m.partNumber}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            isShortage
                              ? "bg-rose-950 text-rose-300 border-rose-700"
                              : isReplenishing
                                ? "bg-amber-950 text-amber-300 border-amber-700"
                                : "bg-emerald-950 text-emerald-300 border-emerald-700"
                          }`}
                        >
                          {isShortage ? "SHORTAGE" : isReplenishing ? "REPLENISHING" : "AVAILABLE"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{m.description}</div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] pt-1 border-t border-slate-800/60 text-slate-400">
                        <div>
                          On-Hand: <strong className="text-white">{onHand}</strong> / {m.bins * m.binCapacity} {m.unit}
                        </div>
                        <div>
                          Reserved: <strong className="text-cyan-300">{reserved}</strong> {m.unit}
                        </div>
                        <div>
                          Reorder At: <strong className="text-amber-400">{m.reorderPoint}</strong> {m.unit}
                        </div>
                      </div>
                      {activeOrder && (
                        <div className="text-[9px] text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded flex items-center justify-between border border-sky-900/50">
                          <span>Handler #{activeOrder.handler + 1} ({activeOrder.status})</span>
                          <span>ETA: {new Date(activeOrder.delivery).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Interactive Fast Actions */}
          <div className="flex items-center space-x-2 pt-1">
            {station.rackId ? (
              <>
                <button
                  onClick={() => {
                    advanceStation(station.id);
                    closeModal();
                  }}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Fast-Advance Station</span>
                </button>
                <button
                  disabled={useAssemblyStore.getState().readOnly}
                  onClick={() => toggleStationBlock(station.id)}
                  className={`flex items-center space-x-1 py-2 px-3 rounded-lg text-xs font-semibold border transition ${
                    station.status === "BLOCKED"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
                      : "bg-rose-950/80 hover:bg-rose-900 border-rose-700 text-rose-300"
                  }`}
                >
                  {station.status === "BLOCKED" ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Unblock</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Simulate Block</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="w-full text-center text-xs text-slate-500 italic py-1">
                Station is ready and idle. Awaiting next rack along conveyor line.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

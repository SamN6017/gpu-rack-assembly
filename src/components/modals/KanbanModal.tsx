"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  X,
  Kanban,
  Activity,
  Layers,
  Clock,
  Inbox,
  CheckCircle2,
  Cpu,
  AlertTriangle,
  Play,
  FastForward,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  PlusCircle,
  Trash2,
  FileText,
} from "lucide-react";

export function KanbanModal() {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const closeModal = useAssemblyStore((s) => s.closeModal);
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const completedRackIds = useAssemblyStore((s) => s.completedRackIds);
  const metrics = useAssemblyStore((s) => s.metrics);
  const events = useAssemblyStore((s) => s.events);
  const config = useAssemblyStore((s) => s.config);
  const advanceStation = useAssemblyStore((s) => s.advanceStation);
  const toggleStationBlock = useAssemblyStore((s) => s.toggleStationBlock);
  const dispatchNextFromQueue = useAssemblyStore((s) => s.dispatchNextFromQueue);
  const openModal = useAssemblyStore((s) => s.openModal);

  const [activeTab, setActiveTab] = useState<"board" | "events">("board");

  if (activeModal !== "KANBAN") return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md select-none font-mono">
      <div className="bg-[#0b101d] border border-sky-500/50 rounded-2xl w-full max-w-6xl h-[88vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-[#0f172a] border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-950 border border-sky-600/60 text-sky-400">
              <Kanban className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white tracking-wider">
                  GPU RACK ASSEMBLY • CENTRAL KANBAN BOARD
                </h1>
                <span className="text-[10px] bg-sky-950 text-sky-400 px-2 py-0.5 rounded border border-sky-800">
                  DIGITAL TWIN LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Single Source of Truth for Automated Line Operations & Hardware Milestones
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab("board")}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === "board" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Line Stations
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === "events" ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Audit Log ({events.length})
              </button>
            </div>

            <button
              onClick={closeModal}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Close Kanban and resume walk"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Consolidated Operations KPIs Bar (Requirements 14 & 16) */}
        <div className="bg-[#090d18] border-b border-slate-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400">Active Racks:</span>
              <span className="font-bold text-slate-100">{metrics.activeRacks}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Running Stations:</span>
              <span className="font-bold text-emerald-400">{metrics.stationsRunning} / 5</span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-500" />
              <span className="text-slate-400">Empty Stations:</span>
              <span className="font-bold text-slate-300">{metrics.emptyStations}</span>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400">Completed Today:</span>
              <span className="font-bold text-emerald-400">{metrics.completedToday}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Avg Cycle Time:</span>
              <span className="font-bold text-slate-100">
                {config.isDemoMode ? "12s (Demo)" : "12.0 min"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">Queue Buffer:</span>
              <span className="font-bold text-purple-300">{metrics.queueCount} racks</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {metrics.systemHealth === "BLOCKED" ? (
              <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                LINE BLOCKED (DOWNSTREAM OCCUPIED)
              </span>
            ) : (
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                LINE HEALTH: NOMINAL
              </span>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === "board" ? (
            <div className="grid grid-cols-7 gap-3.5 h-full min-h-[460px]">
              {/* Column 1: Queue */}
              <div className="bg-[#0e1424] border border-purple-900/50 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center space-x-1.5 text-purple-400 font-bold text-xs">
                      <Inbox className="w-4 h-4" />
                      <span>QUEUE</span>
                    </div>
                    <span className="text-[10px] bg-purple-950 px-1.5 py-0.5 rounded text-purple-300 border border-purple-800">
                      {queueRackIds.length}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                    {queueRackIds.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-6 text-center">
                        Queue empty
                      </div>
                    ) : (
                      queueRackIds.map((id, idx) => (
                        <div
                          key={id}
                          onClick={() => openModal("RACK", id)}
                          className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-purple-600/60 p-2.5 rounded-lg cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                            <span>#{idx + 1} {id}</span>
                            <span className="text-[9px] text-purple-400 bg-purple-950/80 px-1 rounded">
                              STAGED
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-1">
                            {racks[id]?.modelName || "GPU Rack"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <button
                    onClick={() => dispatchNextFromQueue()}
                    disabled={queueRackIds.length === 0}
                    className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Dispatch Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openModal("ADD_RACK")}
                    className="w-full py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 text-purple-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Rack</span>
                  </button>
                </div>
              </div>

              {/* Columns 2 to 6: Five Stations */}
              {stations.map((stn) => {
                const rack = stn.rackId ? racks[stn.rackId] : null;
                let remText = "WAITING";
                let prog = 0;
                let elapsed = "00:00";

                if (stn.rackId && rack && stn.enteredAt) {
                  const el = Math.max(0, (Date.now() - stn.enteredAt) / 1000);
                  const dur = stn.durationSeconds || 720;
                  const rem = Math.max(0, dur - el);
                  prog = Math.min(100, Math.round((el / dur) * 100));

                  const m = Math.floor(rem / 60);
                  const s = Math.floor(rem % 60);
                  remText = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                  elapsed = `${Math.floor(el / 60)}m ${Math.floor(el % 60)}s`;

                  if (stn.status === "COMPLETE") remText = "READY";
                  if (stn.status === "BLOCKED") remText = "BLOCKED";
                }

                return (
                  <div
                    key={stn.id}
                    className={`border rounded-xl p-3 flex flex-col justify-between transition ${
                      stn.status === "RUNNING"
                        ? "bg-[#0e172a] border-sky-700/60"
                        : stn.status === "COMPLETE"
                        ? "bg-[#0a1e1e] border-emerald-700/60"
                        : stn.status === "BLOCKED"
                        ? "bg-[#251017] border-rose-600/80 animate-pulse"
                        : "bg-[#0c121e] border-slate-800/80 opacity-80"
                    }`}
                  >
                    <div>
                      {/* Station Title */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
                        <span className="font-bold text-xs text-sky-400">STN {stn.number}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            stn.status === "RUNNING"
                              ? "bg-sky-950 text-sky-300"
                              : stn.status === "COMPLETE"
                              ? "bg-emerald-950 text-emerald-300"
                              : stn.status === "BLOCKED"
                              ? "bg-rose-950 text-rose-300"
                              : "bg-slate-900 text-slate-500"
                          }`}
                        >
                          {stn.status}
                        </span>
                      </div>

                      <div className="text-[11px] font-semibold text-slate-200 mb-2 truncate">
                        {stn.name}
                      </div>

                      {/* Station Content */}
                      {stn.rackId && rack ? (
                        <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                          <button
                            onClick={() => openModal("RACK", rack.id)}
                            className="flex items-center space-x-1.5 font-bold text-xs text-sky-300 hover:underline"
                          >
                            <Cpu className="w-3.5 h-3.5 text-sky-400" />
                            <span>{rack.id}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 truncate">{rack.modelName}</div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">{prog}%</span>
                              <span className="font-bold text-sky-300">{remText}</span>
                            </div>
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  stn.status === "COMPLETE"
                                    ? "bg-emerald-500"
                                    : stn.status === "BLOCKED"
                                    ? "bg-rose-500"
                                    : "bg-sky-500"
                                }`}
                                style={{ width: `${prog}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-800">
                            In Station: {elapsed}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-950/40 p-4 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
                          Awaiting rack
                        </div>
                      )}
                    </div>

                    {/* Quick Fast-Forward Action */}
                    {stn.rackId && (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center space-x-1">
                        <button
                          onClick={() => advanceStation(stn.id)}
                          className="flex-1 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition"
                          title="Advance station immediately"
                        >
                          <FastForward className="w-2.5 h-2.5" />
                          <span>Advance</span>
                        </button>
                        <button
                          onClick={() => toggleStationBlock(stn.id)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                            stn.status === "BLOCKED"
                              ? "bg-emerald-600 text-white border-emerald-500"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-rose-400"
                          }`}
                        >
                          {stn.status === "BLOCKED" ? "Unblock" : "Block"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Column 7: Completed */}
              <div className="bg-[#0e1818] border border-emerald-900/50 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>COMPLETED</span>
                    </div>
                    <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-300 border border-emerald-800">
                      {completedRackIds.length}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                    {completedRackIds.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-6 text-center">
                        No completed racks
                      </div>
                    ) : (
                      completedRackIds.map((id) => (
                        <div
                          key={id}
                          onClick={() => openModal("RACK", id)}
                          className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-600/60 p-2.5 rounded-lg cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                            <span>{id}</span>
                            <span className="text-[9px] text-emerald-400 bg-emerald-950 px-1 rounded">
                              QA PASSED
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-1">
                            {racks[id]?.modelName || "GPU Rack"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                  Validated & Stored in Dispatch Bay
                </div>
              </div>
            </div>
          ) : (
            /* Audit Stream Tab */
            <div className="space-y-2 font-mono text-xs max-w-3xl mx-auto">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-sky-400 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
                        {evt.type}
                      </span>
                      <span className="font-semibold text-slate-200">{evt.message}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Target Rack: {evt.rackId} {evt.stationId && `• Station: ${evt.stationId}`}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0f172a] border-t border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Assembly rule: 12-minute cycle per station with downstream blocking logic</span>
          <button
            onClick={closeModal}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition"
          >
            Return to Factory Walk [ESC]
          </button>
        </div>
      </div>
    </div>
  );
}

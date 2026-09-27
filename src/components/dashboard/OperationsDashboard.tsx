"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import { StationCard } from "./StationCard";
import { QueueCompletedList } from "./QueueCompletedList";
import {
  Kanban,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function OperationsDashboard() {
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const events = useAssemblyStore((s) => s.events);

  const [activeTab, setActiveTab] = useState<"stations" | "events">("stations");
  const [isQueueSectionExpanded, setIsQueueSectionExpanded] = useState(true);

  return (
    <div className="w-full xl:w-[440px] 2xl:w-[480px] bg-[#090e1a]/95 border-l border-slate-800/80 flex flex-col h-[calc(100vh-4rem)] z-10 select-none overflow-hidden">
      {/* Panel Top Tabs */}
      <div className="h-12 border-b border-slate-800/90 px-4 flex items-center justify-between bg-[#0b1120] shrink-0 font-mono">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab("stations")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "stations"
                ? "bg-slate-800 text-sky-400 border border-slate-700/80 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>LINE STATIONS (5)</span>
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "events"
                ? "bg-slate-800 text-sky-400 border border-slate-700/80 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>EVENT AUDIT</span>
            {events.length > 0 && (
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded-full">
                {events.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === "stations" ? (
          <>
            {/* Stations Flow (STATION 1 to 5) */}
            <div className="space-y-3">
              {stations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  rack={station.rackId ? racks[station.rackId] || null : null}
                />
              ))}
            </div>

            {/* Ingestion & Completed Collapsible Section */}
            <div className="pt-2">
              <button
                onClick={() => setIsQueueSectionExpanded(!isQueueSectionExpanded)}
                className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-400 hover:text-slate-200 py-1 mb-2"
              >
                <span>BUFFER STORAGE & QUEUE</span>
                {isQueueSectionExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {isQueueSectionExpanded && <QueueCompletedList />}
            </div>
          </>
        ) : (
          /* Real-time Event Log */
          <div className="space-y-2 font-mono text-xs">
            {events.length === 0 ? (
              <div className="text-center text-slate-500 py-12">No events recorded yet.</div>
            ) : (
              events.map((evt) => {
                const date = new Date(evt.timestamp);
                const timeStr = date.toTimeString().split(" ")[0];

                const typeColor = {
                  RACK_ENTERED: "text-sky-400 bg-sky-950/60 border-sky-800/40",
                  RACK_COMPLETED_STATION: "text-emerald-400 bg-emerald-950/60 border-emerald-800/40",
                  RACK_TRANSIT_START: "text-indigo-400 bg-indigo-950/60 border-indigo-800/40",
                  RACK_BLOCKED: "text-rose-400 bg-rose-950/60 border-rose-800/40",
                  RACK_COMPLETED_LINE: "text-teal-400 bg-teal-950/60 border-teal-800/40",
                  RACK_QUEUED: "text-purple-400 bg-purple-950/60 border-purple-800/40",
                }[evt.type];

                return (
                  <div
                    key={evt.id}
                    className="p-2.5 rounded-lg bg-[#0e1524] border border-slate-800 flex flex-col space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${typeColor}`}
                      >
                        {evt.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">{timeStr}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans">{evt.message}</p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Target: {evt.rackId}</span>
                      {evt.stationId && <span>At: {evt.stationId}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  Inbox,
  CheckCircle2,
  Cpu,
  Eye,
  PlusCircle,
  ArrowRight,
  Trash2,
  ChevronDown,
} from "lucide-react";

export function QueueCompletedList() {
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const completedRackIds = useAssemblyStore((s) => s.completedRackIds);
  const racks = useAssemblyStore((s) => s.racks);
  const selectRack = useAssemblyStore((s) => s.selectRack);
  const addRackToQueue = useAssemblyStore((s) => s.addRackToQueue);
  const dispatchNextFromQueue = useAssemblyStore((s) => s.dispatchNextFromQueue);
  const removeRackFromQueue = useAssemblyStore((s) => s.removeRackFromQueue);
  const setCameraPreset = useAssemblyStore((s) => s.setCameraPreset);

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const modelOptions = [
    "NVIDIA GB200 NVL72",
    "NVIDIA H100 Supercluster",
    "NVIDIA B200 Dual-Node",
    "AMD Instinct MI300X OAM",
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
      {/* Queue Column */}
      <div className="bg-[#0f1626]/85 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center space-x-2">
            <Inbox className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-200">INGESTION QUEUE</span>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800/50">
              {queueRackIds.length}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {queueRackIds.length > 0 && (
              <button
                onClick={() => dispatchNextFromQueue()}
                className="text-[10px] bg-sky-600/80 hover:bg-sky-500 text-white px-2 py-0.5 rounded flex items-center gap-1 transition"
                title="Dispatch next rack into Station 1"
              >
                <span>Dispatch</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-purple-900 transition"
              >
                <PlusCircle className="w-3 h-3" />
                <span>+ Add</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>

              {showAddDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-slate-950 border border-purple-600/70 p-1.5 rounded-lg shadow-2xl z-40 space-y-1">
                  {modelOptions.map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        addRackToQueue(model);
                        setShowAddDropdown(false);
                      }}
                      className="w-full text-left p-1 text-[11px] rounded hover:bg-purple-950 text-slate-200 hover:text-purple-300 transition truncate"
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {queueRackIds.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic py-4 text-center">
              Queue is empty. Click &quot;+ Add&quot; to enqueue a GPU rack.
            </div>
          ) : (
            queueRackIds.map((id, index) => {
              const rack = racks[id];
              return (
                <div
                  key={id}
                  onClick={() => selectRack(id)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer text-xs group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-purple-400 font-bold">#{index + 1}</span>
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold text-slate-200">{id}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                      {rack?.modelName?.split(" ")[1] || "GPU Rack"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRackFromQueue(id);
                      }}
                      className="p-1 text-slate-600 hover:text-rose-400 transition"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <Eye className="w-3 h-3 text-slate-600 group-hover:text-sky-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Completed Column */}
      <div className="bg-[#0f1626]/85 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">COMPLETED STORAGE</span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800/50">
              {completedRackIds.length}
            </span>
          </div>
          <button
            onClick={() => setCameraPreset("Completed")}
            className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline"
          >
            Focus 3D Bay
          </button>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {completedRackIds.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic py-4 text-center">
              No racks completed yet
            </div>
          ) : (
            completedRackIds.map((id) => {
              const rack = racks[id];
              return (
                <div
                  key={id}
                  onClick={() => selectRack(id)}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer text-xs group"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-slate-200">{id}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                      QA PASSED
                    </span>
                    <Eye className="w-3 h-3 text-slate-600 group-hover:text-emerald-400" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

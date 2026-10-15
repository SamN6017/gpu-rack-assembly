"use client";

import React, { useState } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import { X, Server, PlusCircle, Layers, ShieldCheck } from "lucide-react";

export function AddRackModal() {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const closeModal = useAssemblyStore((s) => s.closeModal);
  const addRackToQueue = useAssemblyStore((s) => s.addRackToQueue);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);

  const [rackType, setRackType] = useState("NVIDIA GB200 NVL72");
  const [priority, setPriority] = useState("Normal");

  if (activeModal !== "ADD_RACK") return null;

  const nextId = `RACK-${String(queueRackIds.length + 9).padStart(3, "0")}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRackToQueue(rackType);
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-[100] isolate flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none font-mono">
      <div className="bg-[#0c121e] border border-purple-500/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#130f24] border-b border-purple-900/60 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-950 border border-purple-700/80 text-purple-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">
                STAGE NEW GPU RACK
              </h2>
              <p className="text-[11px] text-purple-300/80">Queue Ingestion Terminal 01</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Rack ID */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold block">Generated Rack ID:</label>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-sky-400 font-bold text-sm tracking-widest">
              {nextId}
            </div>
          </div>

          {/* Rack Architecture Selection */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold block">GPU Rack Architecture:</label>
            <select
              value={rackType}
              onChange={(e) => setRackType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-lg font-mono text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="NVIDIA GB200 NVL72">NVIDIA GB200 NVL72 (72x Blackwell • 120kW)</option>
              <option value="NVIDIA H100 Supercluster">NVIDIA H100 NVL (32x Hopper • 40kW)</option>
              <option value="NVIDIA B200 Dual-Node">NVIDIA B200 Dual-Node (64x Blackwell • 65kW)</option>
              <option value="AMD Instinct MI300X OAM">AMD Instinct MI300X (64x OAM • 55kW)</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold block">Production Dispatch Priority:</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 p-2.5 rounded-lg font-mono text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="Normal">Normal Sequence</option>
              <option value="High">Expedited / High Priority</option>
              <option value="Urgent">Critical Batch</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add to Queue</span>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

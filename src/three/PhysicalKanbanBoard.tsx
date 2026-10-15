"use client";

import React from "react";
import { KANBAN_POSITION } from "./factoryLayout";
import { Text, Html } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";
import { Kanban, Clock, Cpu, CheckCircle2, Play, AlertCircle } from "lucide-react";

export function PhysicalKanbanBoard() {
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const completedRackIds = useAssemblyStore((s) => s.completedRackIds);
  const metrics = useAssemblyStore((s) => s.metrics);
  const openModal = useAssemblyStore((s) => s.openModal);
  const activeModal = useAssemblyStore((s) => s.activeModal);

  return (
    <group position={KANBAN_POSITION}>
      {[-4,4].map(x=><mesh key={x} position={[x,0,-0.25]}><boxGeometry args={[.4,4,.6]}/><meshStandardMaterial color="#475569"/></mesh>)}
      {/* Heavy Heavy Duty Industrial Steel Mount Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[13.2, 6.2, 0.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Screen Bezel Frame */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[12.8, 5.8, 0.05]} />
        <meshStandardMaterial color="#090d16" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* High-Resolution LED Screen (Backlit Panel) */}
      <mesh position={[0, 0, 0.23]}>
        <planeGeometry args={[12.6, 5.6]} />
        <meshStandardMaterial
          color="#0a0f1d"
          roughness={0.3}
          metalness={0.1}
          emissive="#060c18"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Top Banner Signage on Steel Frame */}
      <Text
        position={[0, 3.3, 0.25]}
        fontSize={0.35}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        GPU RACK ASSEMBLY • SIMULATION KANBAN
      </Text>

      {/* Crisp 3D HTML Content Panel rendering live synchronized state (hidden when modal is open) */}
      {activeModal === "NONE" && (
        <Html
          position={[0, 0, 0.26]}
          transform
          distanceFactor={10}
          occlude
          zIndexRange={[5, 0]}
          className="pointer-events-auto select-none"
        >
        <div
          onClick={() => openModal("KANBAN")}
          className="w-[1000px] h-[450px] p-6 text-white font-mono flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-sky-500/50 rounded-xl transition duration-200"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <span className="p-1.5 rounded-lg bg-sky-950 border border-sky-800 text-sky-400">
                <Kanban className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-wider text-slate-100">
                  CENTRAL ASSEMBLY OPERATIONS BOARD
                </h2>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  SYNCHRONIZED WITH DIGITAL TWIN ENGINE
                </div>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center space-x-3 text-xs">
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Active: <b className="text-sky-400">{metrics.activeRacks}</b>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Running: <b className="text-emerald-400">{metrics.stationsRunning}/5</b>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Completed: <b className="text-emerald-400">{metrics.completedToday}</b>
              </span>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-7 gap-3 py-4 flex-1">
            {/* 1. Queue Column */}
            <div className="bg-slate-950/80 border border-purple-900/60 rounded-lg p-2.5 flex flex-col">
              <div className="text-[11px] font-bold text-purple-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                <span>QUEUE</span>
                <span>({queueRackIds.length})</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1">
                {queueRackIds.map((id, idx) => (
                  <div key={id} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-[11px]">
                    <div className="font-bold text-slate-200">#{idx + 1} {id}</div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {racks[id]?.modelName?.split(" ")[1] || "GPU"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2 to 6. Stations 1 to 5 */}
            {stations.map((station) => {
              const rack = station.rackId ? racks[station.rackId] : null;
              let timerText = "WAITING";
              if (station.rackId && station.enteredAt) {
                const rem = Math.max(0, (station.durationSeconds || 720) - ((useAssemblyStore.getState().virtualTime ?? Date.now()) - station.enteredAt) / 1000);
                timerText = `${Math.floor(rem / 60)}m ${Math.floor(rem % 60)}s`;
              }

              return (
                <div
                  key={station.id}
                  className={`border rounded-lg p-2.5 flex flex-col justify-between ${
                    station.status === "RUNNING"
                      ? "bg-slate-950/80 border-sky-800/80"
                      : station.status === "COMPLETE"
                      ? "bg-emerald-950/40 border-emerald-800/80"
                      : station.status === "BLOCKED"
                      ? "bg-rose-950/50 border-rose-800/80 animate-pulse"
                      : "bg-slate-950/50 border-slate-800 text-slate-500"
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-bold text-slate-200 border-b border-slate-800/80 pb-1 mb-2 flex items-center justify-between">
                      <span>STN {station.number}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded uppercase font-bold text-sky-400">
                        {station.status}
                      </span>
                    </div>

                    {station.rackId && rack ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-xs font-bold text-white">
                          <Cpu className="w-3 h-3 text-sky-400" />
                          <span>{station.rackId}</span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">{rack.modelName}</div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic py-4 text-center">
                        EMPTY
                      </div>
                    )}
                  </div>

                  {station.rackId && (
                    <div className="text-[10px] font-bold text-sky-300 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <Clock className="w-3 h-3" />
                      <span>{timerText}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 7. Completed Column */}
            <div className="bg-slate-950/80 border border-emerald-900/60 rounded-lg p-2.5 flex flex-col">
              <div className="text-[11px] font-bold text-emerald-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                <span>COMPLETED</span>
                <span>({completedRackIds.length})</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1">
                {completedRackIds.map((id) => (
                  <div key={id} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-[11px]">
                    <div className="font-bold text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {id}
                    </div>
                    <div className="text-[9px] text-slate-400">QA PASSED</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Call-to-action */}
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-lg flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-[10px]">
                [E]
              </span>
              Click or press E while standing near board to open full operational dashboard
            </span>
            <span className="text-[11px] text-slate-400">
              Station Cycle Rule: 12 min (720s) standard
            </span>
          </div>
        </div>
      </Html>
      )}
    </group>
  );
}

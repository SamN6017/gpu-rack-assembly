"use client";

import React, { useMemo } from "react";
import { KANBAN_POSITION } from "./factoryLayout";
import { Text, Html } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";
import { deriveVirtualKanbanCards } from "@/services/virtualKanbanService";
import { KANBAN_STAGES, type KanbanStage } from "@/types/virtualKanban";
import { Kanban, Clock, Cpu, CheckCircle2, Play, AlertCircle, RefreshCw, Box, Truck } from "lucide-react";

export function PhysicalKanbanBoard() {
  const manufacturing = useAssemblyStore((s) => s.manufacturing);
  const manufacturingConfig = useAssemblyStore((s) => s.manufacturingConfig);
  const metrics = useAssemblyStore((s) => s.metrics);
  const openModal = useAssemblyStore((s) => s.openModal);
  const activeModal = useAssemblyStore((s) => s.activeModal);

  const cards = useMemo(() => {
    return deriveVirtualKanbanCards(manufacturing, manufacturingConfig, []);
  }, [manufacturing, manufacturingConfig]);

  const cardsByStage = useMemo(() => {
    const map: Record<KanbanStage, typeof cards> = {
      MATERIAL_AVAILABLE: [],
      REPLENISHMENT_REQUIRED: [],
      REQUEST_CREATED: [],
      PICKING_FROM_WAREHOUSE: [],
      IN_TRANSIT: [],
      DELIVERED: [],
      REPLENISHMENT_COMPLETED: [],
    };
    for (const c of cards) {
      if (map[c.status]) map[c.status].push(c);
    }
    return map;
  }, [cards]);

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
                  VIRTUAL KANBAN MANAGEMENT SYSTEM
                </h2>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  PULL REPLENISHMENT · LIVE DIGITAL TWIN
                </div>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center space-x-3 text-xs">
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Active Pulls: <b className="text-sky-400">{cards.filter(c => c.status !== "MATERIAL_AVAILABLE" && c.status !== "REPLENISHMENT_COMPLETED").length}</b>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Shortages: <b className="text-rose-400">{cards.filter(c => c.priority === "HIGH").length}</b>
              </span>
              <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded">
                Materials: <b className="text-emerald-400">{cards.length}</b>
              </span>
            </div>
          </div>

          {/* 7-Stage Digital Kanban Board Grid */}
          <div className="grid grid-cols-7 gap-2.5 py-3 flex-1 overflow-hidden">
            {KANBAN_STAGES.map((stage) => {
              const stageCards = cardsByStage[stage.key] || [];

              return (
                <div
                  key={stage.key}
                  className="bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between overflow-hidden"
                  style={{ borderTop: `2.5px solid ${stage.color}` }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                    <span className="text-[10px] font-bold text-slate-200 truncate">{stage.label}</span>
                    <span
                      className="text-[9px] font-bold px-1 rounded-full shrink-0"
                      style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                    >
                      {stageCards.length}
                    </span>
                  </div>

                  <div className="space-y-1 overflow-y-auto flex-1 pr-0.5">
                    {stageCards.length === 0 ? (
                      <div className="text-[9px] text-slate-600 italic py-4 text-center">Empty</div>
                    ) : (
                      stageCards.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          className={`p-1.5 rounded border text-[10px] ${
                            c.priority === "HIGH"
                              ? "bg-rose-950/30 border-rose-800/60 text-rose-200"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="font-bold text-white truncate">{c.partNumber}</div>
                          <div className="flex items-center justify-between text-[8px] text-slate-400 mt-0.5">
                            <span className="text-sky-400">S{c.workstationIndex + 1}</span>
                            <span>{c.currentInventory} {c.unit}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Call-to-action */}
          <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-lg flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
              <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-[10px]">
                [E]
              </span>
              Click or press E while standing near board to open full Virtual Kanban Management Board
            </span>
            <span className="text-[11px] text-slate-400">
              7-Stage Closed-Loop Pull Replenishment
            </span>
          </div>
        </div>
      </Html>
      )}
    </group>
  );
}

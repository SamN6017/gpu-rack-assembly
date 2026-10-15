"use client";

import React, { useState } from "react";
import { Text, Html } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";
import { Inbox, PlusCircle, ArrowRight, Server, Trash2 } from "lucide-react";

export function QueueBay3D() {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const racks = useAssemblyStore((s) => s.racks);
  const addRackToQueue = useAssemblyStore((s) => s.addRackToQueue);
  const dispatchNextFromQueue = useAssemblyStore((s) => s.dispatchNextFromQueue);
  const selectRack = useAssemblyStore((s) => s.selectRack);
  const removeRackFromQueue = useAssemblyStore((s) => s.removeRackFromQueue);
  const setCameraPreset = useAssemblyStore((s) => s.setCameraPreset);

  const [showModelPicker, setShowModelPicker] = useState(false);

  const modelOptions = [
    { name: "NVIDIA GB200 NVL72", desc: "72x B200 • 120kW" },
    { name: "NVIDIA H100 Supercluster", desc: "32x H100 • 40kW" },
    { name: "NVIDIA B200 Dual-Node", desc: "64x B200 • 65kW" },
    { name: "AMD Instinct MI300X OAM", desc: "64x MI300X • 55kW" },
  ];

  return (
    <group position={[-28, 0, 0]}>
      {/* Heavy Steel Foundation Staging Pad */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[12, 0.08, 4.4]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Safety Chevron Floor Demarcation */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[12.2, 0.01, 4.6]} />
        <meshBasicMaterial color="#a855f7" wireframe />
      </mesh>

      {/* Floor Bay Markings */}
      {Array.from({ length: 4 }).map((_, i) => {
        const xSlot = 4 - i * 2.8;
        return (
          <group key={i} position={[xSlot, 0.1, 0]}>
            {/* Slot Border Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.2, 1.25, 24]} />
              <meshBasicMaterial color="#7e22ce" />
            </mesh>
            <Text
              position={[0, 0.01, 1.7]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.28}
              color="#c084fc"
              anchorX="center"
              anchorY="middle"
            >
              {i === 0 ? "BAY #1 (NEXT IN LINE)" : `BAY #${i + 1}`}
            </Text>
          </group>
        );
      })}

      {/* Industrial Queue Overhead Archway Gantry */}
      <group position={[4.5, 0, -1.8]}>
        {/* Left Pillar */}
        <mesh position={[-6, 3.2, 0]} castShadow>
          <boxGeometry args={[0.25, 6.4, 0.25]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Right Pillar */}
        <mesh position={[0.5, 3.2, 0]} castShadow>
          <boxGeometry args={[0.25, 6.4, 0.25]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Header Beam */}
        <mesh position={[-2.75, 6.3, 0]} castShadow>
          <boxGeometry args={[7.2, 0.4, 0.35]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Illuminated Sign Board */}
        <group position={[-2.75, 6.3, 0.2]}>
          <mesh>
            <boxGeometry args={[6.8, 0.55, 0.05]} />
            <meshStandardMaterial color="#1e1035" roughness={0.2} metalness={0.8} />
          </mesh>
          <Text
            position={[-1.2, 0.02, 0.04]}
            fontSize={0.22}
            color="#c084fc"
            anchorX="center"
            anchorY="middle"
          >
            GPU INGESTION QUEUE • BUFFER
          </Text>
          <Text
            position={[2.0, 0.02, 0.04]}
            fontSize={0.2}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
          >
            {`${queueRackIds.length} RACKS`}
          </Text>
        </group>
      </group>

      {/* Interactive Queue Dispatch & Add HUD (hidden when modal is open) */}
      {activeModal === "NONE" && (
        <Html
          position={[2.5, 7.3, 0]}
          center
          distanceFactor={26}
          occlude
          zIndexRange={[10, 0]}
          className="pointer-events-auto select-none"
        >
        <div className="flex flex-col items-center space-y-1.5 font-mono">
          <div className="bg-slate-950/95 border border-purple-500/70 p-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 text-purple-400 font-bold px-1.5 py-0.5 bg-purple-950/80 rounded border border-purple-800/60">
              <Inbox className="w-3.5 h-3.5" />
              <span>QUEUE ({queueRackIds.length})</span>
            </div>

            {/* Quick Dispatch Button */}
            <button
              onClick={() => dispatchNextFromQueue()}
              disabled={queueRackIds.length === 0}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold shadow transition"
              title="Dispatch front rack into Station 1"
            >
              <span>Dispatch</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            {/* Add Rack Dropdown Toggle */}
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700/60 transition"
              title="Add GPU Rack to Queue"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ Add</span>
            </button>
          </div>

          {/* Model Picker Popup */}
          {showModelPicker && (
            <div className="bg-slate-950 border border-purple-500/80 p-2.5 rounded-xl shadow-2xl backdrop-blur-md w-64 space-y-1 text-left animate-in fade-in zoom-in-95 duration-150">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 border-b border-slate-800 pb-1">
                Select GPU Rack Architecture:
              </div>
              {modelOptions.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => {
                    addRackToQueue(opt.name);
                    setShowModelPicker(false);
                  }}
                  className="w-full text-left p-1.5 rounded-lg hover:bg-purple-950/70 border border-transparent hover:border-purple-800 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                      {opt.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{opt.desc}</div>
                  </div>
                  <PlusCircle className="w-3.5 h-3.5 text-purple-400 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Html>
      )}
    </group>
  );
}

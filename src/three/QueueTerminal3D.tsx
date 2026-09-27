"use client";

import React from "react";
import { Text, Html } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";
import { Terminal, PlusCircle } from "lucide-react";

export function QueueTerminal3D() {
  const openModal = useAssemblyStore((s) => s.openModal);

  return (
    <group position={[-25, 0, 4.5]} rotation={[0, Math.PI, 0]}>
      {/* Heavy Steel Pedestal Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Vertical Post */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Terminal Angled Head Housing */}
      <group position={[0, 1.3, 0]} rotation={[0.4, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.85, 0.6, 0.12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Screen Display Panel */}
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[0.78, 0.52]} />
          <meshStandardMaterial
            color="#1e1035"
            emissive="#2e1065"
            emissiveIntensity={0.6}
            roughness={0.2}
          />
        </mesh>

        <Text
          position={[0, 0.16, 0.08]}
          fontSize={0.045}
          color="#c084fc"
          anchorX="center"
          anchorY="middle"
        >
          QUEUE INGESTION TERMINAL
        </Text>

        <Text
          position={[0, 0.04, 0.08]}
          fontSize={0.035}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          [E] STAGE GPU RACK
        </Text>

        <Text
          position={[0, -0.1, 0.08]}
          fontSize={0.028}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          READY FOR OPERATOR INPUT
        </Text>

        {/* Screen Click Area */}
        <Html position={[0, 0, 0.09]} center distanceFactor={12} className="pointer-events-auto">
          <button
            onClick={() => openModal("ADD_RACK")}
            className="w-36 py-1 px-2 rounded bg-purple-600/80 hover:bg-purple-500 text-white font-mono text-[10px] font-bold flex items-center justify-center gap-1 shadow-lg transition"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Open Terminal</span>
          </button>
        </Html>
      </group>

      {/* Yellow Safety Floor Ring */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.85, 24]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
    </group>
  );
}

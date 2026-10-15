"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import * as THREE from "three";
import { Rack } from "@/types/rack";
import { useAssemblyStore } from "@/store/assemblyStore";
import { STATION_COORDINATES } from "@/simulation/simulationEngine";
import { Cpu, Zap, Thermometer, Layers, CheckCircle } from "lucide-react";

interface Rack3DProps {
  rack: Rack;
  queueIndex?: number;
  completedIndex?: number;
}

export function Rack3D({ rack, queueIndex = 0, completedIndex = 0 }: Rack3DProps) {
  const selectedRackId = useAssemblyStore((s) => s.selectedRackId);
  const selectRack = useAssemblyStore((s) => s.selectRack);
  const isSelected = selectedRackId === rack.id;
  const [hovered, setHovered] = useState(false);

  const activeModal = useAssemblyStore((s) => s.activeModal);
  const speedMultiplier = useAssemblyStore((s) => s.config?.speedMultiplier || 1);

  const groupRef = useRef<THREE.Group>(null);
  const ledGroupRef = useRef<THREE.Group>(null);
  const isInitializedRef = useRef(false);

  // Determine Target 3D Coordinates
  let targetPos: [number, number, number] = [0, 0, 0];

  if (rack.status === "MOVING") {
    const fromKey = rack.previousStationId || "QUEUE";
    const toKey = rack.targetStationId || "COMPLETED";

    const start = fromKey === "QUEUE" ? [-24, 0, 0] : (STATION_COORDINATES[fromKey] || [-24, 0, 0]);
    const end = toKey === "COMPLETED" ? [27, 0, 0] : (STATION_COORDINATES[toKey] || [27, 0, 0]);

    const p = Math.min(1.0, Math.max(0, rack.moveProgress || 0));
    // Smooth step interpolation
    const smoothP = p * p * (3 - 2 * p);

    const currentX = start[0] + (end[0] - start[0]) * smoothP;
    targetPos = [currentX, 0, 0];
  } else if (rack.status === "QUEUED") {
    targetPos = [-24 - queueIndex * 2.8, 0, 0];
  } else if (rack.status === "COMPLETED") {
    targetPos = [27 + completedIndex * 2.8, 0, 0];
  } else if (rack.currentStationId && STATION_COORDINATES[rack.currentStationId]) {
    targetPos = STATION_COORDINATES[rack.currentStationId];
  }

  // Smooth position slide along conveyor rails
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    if (!isInitializedRef.current) {
      groupRef.current.position.set(targetPos[0], targetPos[1], targetPos[2]);
      isInitializedRef.current = true;
      return;
    }

    const currentX = groupRef.current.position.x;
    const targetX = targetPos[0];
    const diffX = targetX - currentX;

    // Slide smoothly along conveyor track guide rails
    const isSliding = Math.abs(diffX) > 0.04;
    if (isSliding) {
      if (Math.abs(diffX) > 40) {
        // Large reset jump (e.g. simulation timeline reset) -> snap
        groupRef.current.position.x = targetX;
      } else {
        // Natural conveyor sliding speed: smooth transition along track
        const dampFactor = Math.min(10, 3.5 * Math.max(1, Math.sqrt(speedMultiplier)));
        groupRef.current.position.x = THREE.MathUtils.damp(
          currentX,
          targetX,
          dampFactor,
          delta
        );
        // Subtle conveyor rumble / vibration while sliding on roller bed
        groupRef.current.position.y = targetPos[1] + Math.sin(clock.getElapsedTime() * 24) * 0.015;
      }
    } else {
      groupRef.current.position.x = targetX;
      groupRef.current.position.y = targetPos[1];
    }
    groupRef.current.position.z = targetPos[2];

    // Flicker / pulse server activity LEDs
    if (ledGroupRef.current) {
      const t = clock.getElapsedTime();
      ledGroupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          const intensity = 0.4 + 0.6 * Math.sin(t * (6 + (i % 5)) + i);
          child.material.opacity = intensity;
        }
      });
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectRack(rack.id);
      }}
    >
      {/* Selection / Hover Glow Ring on Floor */}
      {(isSelected || hovered) && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial
            color={isSelected ? "#38bdf8" : "#94a3b8"}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Main Server Cabinet Chassis (Dark Titanium/Graphite) */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 3.5, 1.8]} />
        <meshStandardMaterial
          color={isSelected ? "#1e293b" : "#0d131f"}
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>

      {/* Outer Protective Corner Edge Trims */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[1.64, 3.54, 1.84]} />
        <meshStandardMaterial
          color="#334155"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Front Server Bays (8 individual GPU Server Trays / Sleds) */}
      <group position={[0, 1.8, 0.91]}>
        {Array.from({ length: 8 }).map((_, idx) => {
          const trayY = -1.4 + idx * 0.4;
          return (
            <group key={idx} position={[0, trayY, 0]}>
              {/* Tray Faceplate */}
              <mesh castShadow>
                <boxGeometry args={[1.45, 0.34, 0.04]} />
                <meshStandardMaterial
                  color="#151e2e"
                  roughness={0.4}
                  metalness={0.7}
                />
              </mesh>

              {/* Server Tray Aluminum Handles */}
              <mesh position={[-0.6, 0, 0.03]}>
                <boxGeometry args={[0.08, 0.22, 0.04]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0.6, 0, 0.03]}>
                <boxGeometry args={[0.08, 0.22, 0.04]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>

              {/* Perforated Coolant Intake Grilles */}
              <mesh position={[0, 0, 0.025]}>
                <planeGeometry args={[1.0, 0.26]} />
                <meshStandardMaterial
                  color="#080e18"
                  roughness={0.9}
                  metalness={0.1}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* Status Indicator LED Array (Blinking front lights) */}
      <group ref={ledGroupRef} position={[-0.45, 1.8, 0.94]}>
        {Array.from({ length: 8 }).map((_, idx) => {
          const trayY = -1.4 + idx * 0.4;
          return (
            <React.Fragment key={idx}>
              {/* Green Activity LED */}
              <mesh position={[0, trayY + 0.05, 0]}>
                <sphereGeometry args={[0.025, 8, 8]} />
                <meshBasicMaterial
                  color={rack.status === "BLOCKED" ? "#ef4444" : "#10b981"}
                  transparent
                />
              </mesh>
              {/* Cyan Network LED */}
              <mesh position={[0.08, trayY + 0.05, 0]}>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshBasicMaterial color="#38bdf8" transparent />
              </mesh>
            </React.Fragment>
          );
        })}
      </group>

      {/* Rear High-Pressure Liquid Cooling Manifolds */}
      <group position={[0, 1.8, -0.92]}>
        {/* Blue Cold Supply Manifold */}
        <mesh position={[-0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.2, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Red Hot Return Manifold */}
        <mesh position={[0.4, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 3.2, 16]} />
          <meshStandardMaterial color="#dc2626" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>

      {/* Illuminated Top OLED Rack Identification Display */}
      <group position={[0, 3.65, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 0.28, 0.12]} />
          <meshStandardMaterial color="#090d16" roughness={0.2} metalness={0.9} />
        </mesh>
        <Text
          position={[0, 0, 0.07]}
          fontSize={0.16}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          {rack.id}
        </Text>
      </group>

      {/* Hover Floating Quick-Stats Tooltip (hidden when modal is open) */}
      {hovered && !isSelected && activeModal === "NONE" && (
        <Html position={[0, 4.3, 0]} center distanceFactor={14} occlude zIndexRange={[10, 0]} className="pointer-events-none">
          <div className="bg-slate-950/95 border border-sky-500/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md w-56 text-left font-mono pointer-events-none">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-sky-400 text-xs tracking-wider">{rack.id}</span>
              <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                {rack.status}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-semibold mb-1 truncate">
              {rack.modelName}
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-sky-400" />
                {rack.telemetry?.gpuCount}x GPUs
              </span>
              <span className="flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                {rack.telemetry?.tempCelsius}°C
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                {rack.telemetry?.powerKw} kW
              </span>
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-400" />
                {rack.completedStations.length}/5 Done
              </span>
            </div>
            <div className="mt-1.5 pt-1 border-t border-slate-800/80 text-[9px] text-sky-400/80 flex items-center gap-1">
              <span>Click to inspect full digital twin telemetries</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

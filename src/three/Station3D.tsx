"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";
import * as THREE from "three";
import { Station } from "@/types/station";
import { Rack } from "@/types/rack";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Play,
  FastForward,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

interface Station3DProps {
  station: Station;
  rack: Rack | null;
}

export function Station3D({ station, rack }: Station3DProps) {
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const selectedStationId = useAssemblyStore((s) => s.selectedStationId);
  const selectStation = useAssemblyStore((s) => s.selectStation);
  const selectRack = useAssemblyStore((s) => s.selectRack);
  const advanceStation = useAssemblyStore((s) => s.advanceStation);
  const toggleStationBlock = useAssemblyStore((s) => s.toggleStationBlock);
  const isSelected = selectedStationId === station.id;

  const [hovered, setHovered] = useState(false);
  const beaconLightRef = useRef<THREE.PointLight>(null);
  const robotArmRef = useRef<THREE.Group>(null);

  // Animate beacon pulsing and robotic arm when station is running
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconLightRef.current) {
      if (station.status === "RUNNING") {
        beaconLightRef.current.intensity = 1.4 + Math.sin(t * 6) * 0.6;
      } else if (station.status === "BLOCKED") {
        beaconLightRef.current.intensity = 2.0 + Math.sin(t * 10) * 1.5;
      } else if (station.status === "COMPLETE") {
        beaconLightRef.current.intensity = 1.2;
      } else {
        beaconLightRef.current.intensity = 0.2;
      }
    }

    if (robotArmRef.current && station.status === "RUNNING") {
      robotArmRef.current.rotation.y = Math.sin(t * 1.8) * 0.4;
    }
  });

  // Calculate timer & progress
  let remainingText = "WAITING";
  let clockTime = "--:--";
  let progressPct = 0;

  if (station.rackId && rack && station.enteredAt) {
    const elapsedSec = Math.max(0, ((useAssemblyStore.getState().virtualTime ?? Date.now()) - station.enteredAt) / 1000);
    const duration = station.durationSeconds || 720;
    const remainingSec = Math.max(0, duration - elapsedSec);
    progressPct = Math.min(100, Math.round((elapsedSec / duration) * 100));

    const mins = Math.floor(remainingSec / 60);
    const secs = Math.floor(remainingSec % 60);
    clockTime = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    if (station.status === "RUNNING") {
      remainingText = `${clockTime} REMAINING`;
    } else if (station.status === "COMPLETE") {
      remainingText = "READY TO MOVE";
      clockTime = "00:00";
      progressPct = 100;
    } else if (station.status === "BLOCKED") {
      remainingText = "BLOCKED";
      progressPct = 100;
    }
  }

  const statusColorMap = {
    RUNNING: "#0ea5e9", // cyan
    COMPLETE: "#10b981", // emerald
    BLOCKED: "#ef4444", // rose
    EMPTY: "#64748b", // slate
  };

  const activeColor = statusColorMap[station.status];

  return (
    <group
      position={station.position}
      onClick={(e) => {
        e.stopPropagation();
        selectStation(station.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
    >
      {/* Heavy Station Foundation Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.1, 4.2]} />
        <meshStandardMaterial
          color={isSelected ? "#1e3a5f" : "#131b2a"}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>

      {/* Safety Boundary Border */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[4.3, 0.02, 4.3]} />
        <meshBasicMaterial
          color={isSelected ? "#38bdf8" : station.status === "BLOCKED" ? "#ef4444" : "#eab308"}
          wireframe
        />
      </mesh>

      {/* 3D Floor Station Number Tag */}
      <Text
        position={[0, 0.11, 1.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color={isSelected ? "#38bdf8" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
      >
        {`STATION ${station.number}`}
      </Text>

      {/* Gantry Structural Framework */}
      <group position={[0, 0, -1.8]}>
        {/* Left Post */}
        <mesh position={[-2, 3.2, 0]} castShadow>
          <boxGeometry args={[0.2, 6.4, 0.2]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Right Post */}
        <mesh position={[2, 3.2, 0]} castShadow>
          <boxGeometry args={[0.2, 6.4, 0.2]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Overhead Gantry Crossbeam */}
        <mesh position={[0, 6.3, 0]} castShadow>
          <boxGeometry args={[4.3, 0.35, 0.35]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* 3D Physical Digital Signage on Crossbeam */}
        <group position={[0, 6.3, 0.2]}>
          <mesh>
            <boxGeometry args={[3.8, 0.45, 0.05]} />
            <meshStandardMaterial color="#0b1120" roughness={0.2} metalness={0.9} />
          </mesh>
          <Text
            position={[-1.0, 0.02, 0.04]}
            fontSize={0.17}
            color="#38bdf8"
            anchorX="center"
            anchorY="middle"
          >
            {`STN-${station.number}: ${station.name.substring(0, 16).toUpperCase()}`}
          </Text>
          <Text
            position={[1.2, 0.02, 0.04]}
            fontSize={0.17}
            color={activeColor}
            anchorX="center"
            anchorY="middle"
          >
            {station.status === "EMPTY" ? "EMPTY" : clockTime}
          </Text>
        </group>

        {/* Automated Robotic Tool Head */}
        <group ref={robotArmRef} position={[0, 5.8, 0.8]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.4, 16]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.6, 0]} castShadow>
            <boxGeometry args={[0.15, 1.0, 0.15]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.02, 0.3, 8]} />
            <meshBasicMaterial color={station.status === "RUNNING" ? "#38bdf8" : "#64748b"} />
          </mesh>
        </group>
      </group>

      {/* Andon Signal Light Tower */}
      <group position={[2.2, 0, 1.8]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 3, 12]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Red Tier */}
        <mesh position={[0, 3.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 16]} />
          <meshStandardMaterial
            color={station.status === "BLOCKED" ? "#ef4444" : "#450a0a"}
            emissive={station.status === "BLOCKED" ? "#ef4444" : "#000000"}
            emissiveIntensity={station.status === "BLOCKED" ? 2 : 0}
          />
        </mesh>
        {/* Amber Tier */}
        <mesh position={[0, 2.92, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 16]} />
          <meshStandardMaterial
            color={station.status === "COMPLETE" ? "#f59e0b" : "#451a03"}
            emissive={station.status === "COMPLETE" ? "#f59e0b" : "#000000"}
            emissiveIntensity={station.status === "COMPLETE" ? 2 : 0}
          />
        </mesh>
        {/* Green/Cyan Tier */}
        <mesh position={[0, 2.74, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.14, 16]} />
          <meshStandardMaterial
            color={station.status === "RUNNING" ? "#0ea5e9" : "#082f49"}
            emissive={station.status === "RUNNING" ? "#0ea5e9" : "#000000"}
            emissiveIntensity={station.status === "RUNNING" ? 2 : 0}
          />
        </mesh>
        <pointLight
          ref={beaconLightRef}
          position={[0, 2.9, 0]}
          color={activeColor}
          intensity={1.0}
          distance={8}
          decay={2}
        />
      </group>

      {/* Contextual Overhead Status Chip (Only visible on hover, selection, or blocked state; hidden when modal is open) */}
      {activeModal === "NONE" && (hovered || isSelected || station.status === "BLOCKED") && (
        <Html
          position={[0, 7.2, 0]}
          center
          distanceFactor={28}
          occlude
          zIndexRange={[10, 0]}
          className="pointer-events-auto select-none"
        >
          <div
            className={`flex flex-col items-center transition-all duration-200 ${
              hovered || isSelected ? "scale-105 z-30" : "scale-95 opacity-90"
            }`}
          >
            {/* Compact Status Pill */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                selectStation(station.id);
              }}
              className={`flex items-center space-x-2 px-3 py-1 rounded-full border shadow-xl backdrop-blur-md cursor-pointer font-mono text-xs transition ${
                isSelected
                  ? "bg-slate-900 border-sky-400 ring-2 ring-sky-400/50 text-white"
                  : station.status === "BLOCKED"
                  ? "bg-rose-950/90 border-rose-500/80 text-rose-300 animate-pulse"
                  : station.status === "RUNNING"
                  ? "bg-slate-950/90 border-sky-500/50 text-sky-300"
                  : station.status === "COMPLETE"
                  ? "bg-emerald-950/90 border-emerald-500/60 text-emerald-300"
                  : "bg-slate-950/80 border-slate-700 text-slate-400"
              }`}
            >
              <span className="font-bold">STN {station.number}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColor }} />
              <span className="text-[11px] font-medium">
                {station.rackId ? `${station.rackId}` : "EMPTY"}
              </span>
              {station.rackId && (
                <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 font-bold">
                  {clockTime}
                </span>
              )}
            </div>

            {/* Interactive Action Menu (Visible on Hover or Selection) */}
            {(hovered || isSelected) && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-1.5 bg-slate-950/95 border border-slate-700 p-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-1.5 text-[11px] font-mono animate-in fade-in zoom-in-95 duration-150"
              >
                {station.rackId ? (
                  <>
                    <button
                      onClick={() => advanceStation(station.id)}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow transition"
                      title="Instantly complete station process and move rack forward"
                    >
                      <FastForward className="w-3 h-3" />
                      <span>Advance</span>
                    </button>
                    <button
                      onClick={() => toggleStationBlock(station.id)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded font-semibold transition ${
                        station.status === "BLOCKED"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300"
                      }`}
                      title="Simulate maintenance block / unblock"
                    >
                      {station.status === "BLOCKED" ? (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Unblock</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3 h-3" />
                          <span>Block</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => selectRack(station.rackId)}
                      className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    >
                      <Cpu className="w-3 h-3 text-sky-400" />
                      <span>Inspect</span>
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 px-2 py-0.5 italic">
                    Awaiting rack from upstream
                  </span>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

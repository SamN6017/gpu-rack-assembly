"use client";

import React from "react";
import { Text } from "@react-three/drei";

export function FactoryFloor() {
  const floorWidth = 76;
  const floorDepth = 34;
  const ceilingHeight = 11;

  return (
    <group>
      {/* 1. Main Polished Industrial Epoxy Floor (Bright Light/Medium Gray) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial
          color="#d1d5db"
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>

      {/* Subtle Epoxy Floor Grid Lines */}
      <gridHelper
        args={[floorWidth, 38, "#94a3b8", "#cbd5e1"]}
        position={[0, 0.002, 0]}
      />

      {/* Safety Painted Walkways (Industrial High-Visibility Yellow Paths) */}
      {/* Main East-West Operator Thoroughfare in front of Stations */}
      <mesh position={[0, 0.005, 7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth - 4, 2.4]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      {/* Yellow Border Lines along Walkway */}
      <mesh position={[0, 0.006, 6.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth - 4, 0.15]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[0, 0.006, 8.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth - 4, 0.15]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Path leading to North Kanban Board */}
      <mesh position={[0, 0.005, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, 14]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
      </mesh>
      <mesh position={[-1.3, 0.006, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 14]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[1.3, 0.006, -6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.15, 14]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>

      {/* Floor Text Signage */}
      <Text
        position={[-27, 0.02, 7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.65}
        color="#334155"
        anchorX="center"
        anchorY="middle"
      >
        ← INCOMING QUEUE & STAGING
      </Text>

      <Text
        position={[0, 0.02, 7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.7}
        color="#0284c7"
        anchorX="center"
        anchorY="middle"
      >
        GPU ASSEMBLY LINE 01 • WALKWAY
      </Text>

      <Text
        position={[27, 0.02, 7.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.65}
        color="#059669"
        anchorX="center"
        anchorY="middle"
      >
        COMPLETED STORAGE →
      </Text>

      <Text
        position={[0, 0.02, -10]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        ↑ CENTRAL KANBAN BOARD
      </Text>

      {/* 2. Factory Enclosure Walls (Off-White / Light Industrial Panels) */}
      {/* North Wall */}
      <group position={[0, ceilingHeight / 2, -floorDepth / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[floorWidth, ceilingHeight, 0.6]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Protective Dark Baseboard */}
        <mesh position={[0, -ceilingHeight / 2 + 0.6, 0.35]}>
          <boxGeometry args={[floorWidth, 1.2, 0.1]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        {/* Safety Stripe along wall */}
        <mesh position={[0, -ceilingHeight / 2 + 1.25, 0.35]}>
          <boxGeometry args={[floorWidth, 0.1, 0.11]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      </group>

      {/* South Wall with Industrial Windows */}
      <group position={[0, ceilingHeight / 2, floorDepth / 2]}>
        <mesh receiveShadow>
          <boxGeometry args={[floorWidth, ceilingHeight, 0.6]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, -ceilingHeight / 2 + 0.6, -0.35]}>
          <boxGeometry args={[floorWidth, 1.2, 0.1]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        {/* Entrance Door Marking */}
        <mesh position={[0, -ceilingHeight / 2 + 2.2, -0.32]}>
          <planeGeometry args={[4, 3.8]} />
          <meshStandardMaterial color="#0ea5e9" metalness={0.4} roughness={0.3} />
        </mesh>
        <Text
          position={[0, -ceilingHeight / 2 + 4.5, -0.3]}
          fontSize={0.4}
          color="#0369a1"
          anchorX="center"
          anchorY="middle"
        >
          PERSONNEL FACILITY ACCESS • DOOR 01
        </Text>
      </group>

      {/* West Wall (Intake Roll-up Bay) */}
      <group position={[-floorWidth / 2, ceilingHeight / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.6, ceilingHeight, floorDepth]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Roll-up Freight Door */}
        <mesh position={[0.35, -ceilingHeight / 2 + 3.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[10, 6.5]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
        </mesh>
        <Text
          position={[0.36, -ceilingHeight / 2 + 7.2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.4}
          color="#eab308"
          anchorX="center"
          anchorY="middle"
        >
          BAY A: GPU SERVER INTAKE DOCK
        </Text>
      </group>

      {/* East Wall (Dispatch Roll-up Bay) */}
      <group position={[floorWidth / 2, ceilingHeight / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.6, ceilingHeight, floorDepth]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.6} metalness={0.1} />
        </mesh>
        {/* Roll-up Dispatch Door */}
        <mesh position={[-0.35, -ceilingHeight / 2 + 3.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[10, 6.5]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.4} />
        </mesh>
        <Text
          position={[-0.36, -ceilingHeight / 2 + 7.2, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          fontSize={0.4}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
        >
          BAY B: VALIDATED RACK DISPATCH DOCK
        </Text>
      </group>

      {/* 3. Ceiling Roof & Industrial Steel Trusses */}
      <mesh position={[0, ceilingHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[floorWidth, floorDepth]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Structural Steel Trusses crossing the ceiling */}
      {[-24, -12, 0, 12, 24].map((x) => (
        <group key={x} position={[x, ceilingHeight - 0.5, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.4, 0.8, floorDepth]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* High-Bay Overhead LED Linear Light Fixtures (Bright Industrial Illumination) */}
      {[-24, -12, 0, 12, 24].map((x) =>
        [-8, 0, 8].map((z) => (
          <group key={`${x}-${z}`} position={[x, ceilingHeight - 0.9, z]}>
            {/* Fixture Body */}
            <mesh>
              <boxGeometry args={[4, 0.2, 0.8]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Glowing Diffuser */}
            <mesh position={[0, -0.11, 0]}>
              <boxGeometry args={[3.8, 0.05, 0.7]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Local Overhead Downlight */}
            <pointLight
              position={[0, -1, 0]}
              color="#f8fafc"
              intensity={0.65}
              distance={18}
              decay={2}
            />
          </group>
        ))
      )}
    </group>
  );
}

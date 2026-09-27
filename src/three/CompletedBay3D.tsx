"use client";

import React from "react";
import { Text } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";

export function CompletedBay3D() {
  const completedRackIds = useAssemblyStore((s) => s.completedRackIds);

  return (
    <group position={[28, 0, 0]}>
      {/* Heavy Steel Foundation Staging Pad */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[12, 0.08, 4.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Safety Chevron Floor Demarcation */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[12.2, 0.01, 4.6]} />
        <meshBasicMaterial color="#10b981" wireframe />
      </mesh>

      {/* Floor Bay Markings */}
      {Array.from({ length: 4 }).map((_, i) => {
        const xSlot = -4 + i * 2.8;
        return (
          <group key={i} position={[xSlot, 0.1, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.2, 1.25, 24]} />
              <meshBasicMaterial color="#059669" />
            </mesh>
            <Text
              position={[0, 0.01, 1.7]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.28}
              color="#34d399"
              anchorX="center"
              anchorY="middle"
            >
              {`VALIDATED BAY #${i + 1}`}
            </Text>
          </group>
        );
      })}

      {/* Overhead Gantry Archway */}
      <group position={[-3.5, 0, -1.8]}>
        <mesh position={[-0.5, 3.2, 0]} castShadow>
          <boxGeometry args={[0.25, 6.4, 0.25]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[6, 3.2, 0]} castShadow>
          <boxGeometry args={[0.25, 6.4, 0.25]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[2.75, 6.3, 0]} castShadow>
          <boxGeometry args={[7.2, 0.4, 0.35]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Illuminated Sign Board */}
        <group position={[2.75, 6.3, 0.2]}>
          <mesh>
            <boxGeometry args={[6.8, 0.55, 0.05]} />
            <meshStandardMaterial color="#064e3b" roughness={0.2} metalness={0.8} />
          </mesh>
          <Text
            position={[-1.2, 0.02, 0.04]}
            fontSize={0.22}
            color="#6ee7b7"
            anchorX="center"
            anchorY="middle"
          >
            COMPLETED RACKS • QA PASSED
          </Text>
          <Text
            position={[2.0, 0.02, 0.04]}
            fontSize={0.2}
            color="#34d399"
            anchorX="center"
            anchorY="middle"
          >
            {`${completedRackIds.length} STORED`}
          </Text>
        </group>
      </group>
    </group>
  );
}

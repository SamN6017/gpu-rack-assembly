"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AssemblyPathProps {
  startX: number;
  endX: number;
  y?: number;
  z?: number;
}

export function AssemblyPath({ startX, endX, y = 0.05, z = 0 }: AssemblyPathProps) {
  const length = Math.abs(endX - startX);
  const centerX = (startX + endX) / 2;
  const rollersRef = useRef<THREE.Group>(null);

  // Animated conveyor rollers
  useFrame((_, delta) => {
    if (rollersRef.current) {
      rollersRef.current.children.forEach((child) => {
        child.rotation.z -= delta * 3;
      });
    }
  });

  const rollerCount = Math.floor(length / 0.8);
  const rollerSpacing = length / rollerCount;

  return (
    <group position={[centerX, y, z]}>
      {/* Heavy Steel Bed */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[length + 2, 0.12, 2.4]} />
        <meshStandardMaterial
          color="#1e2430"
          roughness={0.6}
          metalness={0.7}
        />
      </mesh>

      {/* Guide Rails on sides */}
      <mesh position={[0, 0.22, 1.25]} castShadow>
        <boxGeometry args={[length + 2, 0.2, 0.1]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.22, -1.25]} castShadow>
        <boxGeometry args={[length + 2, 0.2, 0.1]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Conveyor Rollers */}
      <group ref={rollersRef}>
        {Array.from({ length: rollerCount }).map((_, i) => {
          const xPos = -length / 2 + (i + 0.5) * rollerSpacing;
          return (
            <mesh
              key={i}
              position={[xPos, 0.15, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.06, 0.06, 2.2, 12]} />
              <meshStandardMaterial
                color="#64748b"
                metalness={0.85}
                roughness={0.3}
              />
            </mesh>
          );
        })}
      </group>

      {/* Floor Warning Hazard Stripes */}
      <mesh position={[0, -0.04, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length + 3, 0.35]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
      <mesh position={[0, -0.04, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length + 3, 0.35]} />
        <meshBasicMaterial color="#eab308" />
      </mesh>
    </group>
  );
}

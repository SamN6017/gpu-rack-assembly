"use client";

import React from "react";
import { Text, Line } from "@react-three/drei";
import { useAssemblyStore } from "@/store/assemblyStore";
import { STATION_COORDINATES, WAREHOUSE_POSITION } from "@/three/factoryLayout";

export function MaterialFlow() {
  const snapshot = useAssemblyStore((s) => s.manufacturing);
  const config = useAssemblyStore((s) => s.manufacturingConfig);

  if (!snapshot || !config) return null;

  return (
    <group>
      {/* 1. Central Warehouse Racks & Bulk Staging Area */}
      <group position={WAREHOUSE_POSITION}>
        <Text position={[0, 4.8, 0]} fontSize={0.4} color="#0284c7">
          WAREHOUSE STORAGE · FINITE STOCK
        </Text>
        <Text position={[0, 4.2, 0]} fontSize={0.2} color="#64748b">
          Conserved Industrial Buffer · Direct Pull Replenishment
        </Text>

        {/* Heavy Pallet Racks with Conserved Stock Levels */}
        {[-5, -2.5, 0, 2.5, 5].map((x, i) => {
          const stock = snapshot.stocks[i];
          const hasStock = (stock?.warehouse ?? 0) > 0;

          return (
            <group key={i} position={[x, 0, 0]}>
              {/* Heavy Wooden Pallet */}
              <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.0, 0.25, 2.2]} />
                <meshStandardMaterial color="#854d0e" roughness={0.7} metalness={0.2} />
              </mesh>

              {/* Stacked Material Crates */}
              {[0, 1, 2].map((layer) => (
                <mesh key={layer} position={[0, 0.65 + layer * 0.85, 0]} castShadow>
                  <boxGeometry args={[1.7, 0.75, 1.9]} />
                  <meshStandardMaterial
                    color={hasStock ? "#1e293b" : "#475569"}
                    roughness={0.4}
                    metalness={0.7}
                  />
                </mesh>
              ))}

              {/* Warehouse Inventory Count Signage */}
              <group position={[0, 3.4, 1.05]}>
                <mesh>
                  <boxGeometry args={[1.4, 0.4, 0.05]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <Text position={[0, 0, 0.04]} fontSize={0.18} color="#38bdf8">
                  {`WH: ${stock?.warehouse ?? 0}`}
                </Text>
              </group>
            </group>
          );
        })}
      </group>

      {/* 2. Material Staging Buffer Pad */}
      <group position={[-16, 0, -8]}>
        <Text position={[0, 1.2, 0]} fontSize={0.28} color="#0ea5e9">
          MATERIAL HANDLER DISPATCH STAGING
        </Text>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[5.5, 0.16, 3.6]} />
          <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
        </mesh>
      </group>

      {/* 3. Station Point-of-Use Bins & Transit Pathway */}
      {config.materials.map((m) => {
        const stock = snapshot.stocks.find((s) => s.id === m.id);
        const stnKey = `STATION-${m.station + 1}` as keyof typeof STATION_COORDINATES;
        const targetX = STATION_COORDINATES[stnKey]?.[0] ?? 0;
        const onHand = stock?.onHand ?? m.pointOfUse;
        const isShortage = onHand <= m.safetyStock;

        return (
          <group key={m.id}>
            {/* Guide line from warehouse staging to workstation */}
            <Line
              points={[
                [-25, 0.1, -10],
                [-16, 0.1, -8],
                [targetX, 0.1, -4.8],
              ]}
              color={isShortage ? "#ef4444" : "#0284c7"}
              lineWidth={2}
              dashed
              dashSize={0.6}
              gapSize={0.4}
            />

            {/* Point-of-Use Storage Bins mounted adjacent to workstation */}
            <group position={[targetX, 0, -4.8]}>
              <Text position={[0, 2.6, 0]} fontSize={0.22} color={isShortage ? "#f87171" : "#38bdf8"}>
                {`${m.partNumber} · ${onHand}/${m.bins * m.binCapacity} ${m.unit}`}
              </Text>

              {/* Physical Bins (2-bin / multi-bin representation) */}
              {Array.from({ length: Math.min(m.bins, 4) }, (_, bIdx) => {
                const amount = Math.max(0, Math.min(m.binCapacity, onHand - bIdx * m.binCapacity));
                const isFull = amount === m.binCapacity;
                const isEmpty = amount === 0;

                return (
                  <group
                    key={bIdx}
                    position={[(bIdx - (Math.min(m.bins, 4) - 1) / 2) * 1.35, 0, 0]}
                  >
                    {/* Industrial Bin Shell */}
                    <mesh position={[0, 0.5, 0]} castShadow>
                      <boxGeometry args={[1.15, 0.95, 1.15]} />
                      <meshStandardMaterial
                        color={isFull ? "#065f46" : isEmpty ? "#450a0a" : "#0369a1"}
                        roughness={0.4}
                        metalness={0.5}
                        transparent
                        opacity={0.85}
                      />
                    </mesh>

                    {/* Bin Fill Level Label */}
                    <Text position={[0, 1.25, 0]} fontSize={0.16} color="#ffffff">
                      {`${amount}/${m.binCapacity}`}
                    </Text>
                  </group>
                );
              })}
            </group>

            {/* Glowing Active Toolhead Indicator when station consumes materials */}
            {snapshot.stations[m.station]?.status === "RUNNING" && (
              <mesh position={[targetX, 1.5, -2.5]}>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  emissive="#0284c7"
                  emissiveIntensity={1.2}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* 4. Active Material Handlers Fleet Moving Along Factory Floor */}
      {snapshot.orders.map((order) => {
        const material = config.materials.find((m) => m.id === order.materialId);
        if (!material) return null;

        const stnKey = `STATION-${material.station + 1}` as keyof typeof STATION_COORDINATES;
        const targetX = STATION_COORDINATES[stnKey]?.[0] ?? 0;
        const targetZ = -4.8;

        const isCollecting = snapshot.time < order.dispatch;
        let cartX = -25;
        let cartZ = -10;
        let statusText = `Handler #${order.handler + 1} · Picking @ Warehouse`;

        if (isCollecting) {
          cartX = -25 + (order.handler % 3) * 2;
          cartZ = -10 + Math.floor(order.handler / 3) * 1.5;
        } else {
          const totalDuration = Math.max(1, order.delivery - order.dispatch);
          const progress = Math.max(0, Math.min(1.0, (snapshot.time - order.dispatch) / totalDuration));
          cartX = -25 + (targetX + 25) * progress;
          cartZ = -10 + (targetZ + 10) * progress;
          statusText = `Handler #${order.handler + 1} ➔ STN ${material.station + 1} (${order.quantity} ${material.unit})`;
        }

        return (
          <group key={order.id} position={[cartX, 0.5, cartZ]}>
            {/* Electric Tugger / Autonomous Guided Vehicle (AGV) Chassis */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[1.5, 0.45, 2.0]} />
              <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Flashing Amber Safety Beacon */}
            <mesh position={[0, 1.4, -0.6]}>
              <cylinderGeometry args={[0.08, 0.08, 0.2, 12]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>

            {/* Cargo Box with Parts */}
            <mesh position={[0, 0.75, 0.2]} castShadow>
              <boxGeometry args={[1.1, 1.0, 1.3]} />
              <meshStandardMaterial color="#0284c7" roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Overhead Handler Information Badge */}
            <group position={[0, 1.9, 0]}>
              <mesh>
                <planeGeometry args={[3.2, 0.45]} />
                <meshBasicMaterial color="#090d16" transparent opacity={0.85} />
              </mesh>
              <Text position={[0, 0, 0.02]} fontSize={0.16} color="#38bdf8">
                {statusText}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
}

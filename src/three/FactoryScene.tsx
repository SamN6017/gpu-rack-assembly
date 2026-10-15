"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { MaterialFlow } from "./materials/MaterialFlow";
import { FactoryFloor } from "./FactoryFloor";
import { Station3D } from "./Station3D";
import { Rack3D } from "./Rack3D";
import { AssemblyPath } from "./AssemblyPath";
import { QueueBay3D } from "./QueueBay3D";
import { QueueTerminal3D } from "./QueueTerminal3D";
import { CompletedBay3D } from "./CompletedBay3D";
import { PhysicalKanbanBoard } from "./PhysicalKanbanBoard";
import { FirstPersonController } from "./FirstPersonController";
import { CameraController } from "./CameraController";
import { useAssemblyStore } from "@/store/assemblyStore";

export function FactoryScene() {
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const completedRackIds = useAssemblyStore((s) => s.completedRackIds);
  const viewMode = useAssemblyStore((s) => s.viewMode);

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 1.7, 10], fov: 60 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#cbd5e1"]} />
        <fog attach="fog" args={["#cbd5e1", 35, 75]} />

        {/* Daylight Industrial Facility Illumination */}
        <ambientLight intensity={1.1} color="#f8fafc" />
        <directionalLight
          position={[12, 22, 14]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={65}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          shadow-bias={-0.0001}
          color="#ffffff"
        />
        {/* Soft Cool Overhead Fill */}
        <directionalLight position={[-16, 18, -12]} intensity={0.7} color="#e0f2fe" />

        <Suspense fallback={null}>
          {/* Architectural Envelope: Floor, Walls, Ceiling, Trusses, High-Bay Lights */}
          <FactoryFloor />
          <MaterialFlow />

          {/* Central Assembly Line Conveyor */}
          <AssemblyPath startX={-34} endX={34} />

          {/* Physical Staging Areas */}
          <QueueBay3D />
          <QueueTerminal3D />
          <CompletedBay3D />

          {/* Large Physical Kanban Digital Board mounted on North Wall */}
          <PhysicalKanbanBoard />

          {/* Five Sequential Assembly Stations */}
          {stations.map((station) => (
            <Station3D
              key={station.id}
              station={station}
              rack={station.rackId ? racks[station.rackId] || null : null}
            />
          ))}

          {/* GPU Racks (Active, In-flight, Queued, Completed) */}
          {Object.values(racks).map((rack) => {
            const qIndex = queueRackIds.indexOf(rack.id);
            const cIndex = completedRackIds.indexOf(rack.id);

            return (
              <Rack3D
                key={rack.id}
                rack={rack}
                queueIndex={qIndex >= 0 ? qIndex : 0}
                completedIndex={cIndex >= 0 ? cIndex : 0}
              />
            );
          })}

          {/* Exploration Controller: Walk Mode (WASD+Mouse) or Overview Mode (Orbit) */}
          {viewMode === "WALK" ? <FirstPersonController /> : <CameraController />}
        </Suspense>
      </Canvas>
    </div>
  );
}

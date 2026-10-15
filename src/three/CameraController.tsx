"use client";

import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useAssemblyStore } from "@/store/assemblyStore";
import { STATION_COORDINATES, KANBAN_POSITION } from "@/three/factoryLayout";

export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const cameraPreset = useAssemblyStore((s) => s.cameraPreset);
  const selectedStationId = useAssemblyStore((s) => s.selectedStationId);

  // Target camera position and lookAt target
  const targetCamPos = useRef(new THREE.Vector3(0, 16, 34));
  const targetLookAt = useRef(new THREE.Vector3(0, 2, 0));

  useEffect(() => {
    let focusX = 0;

    if (cameraPreset === "Overview") {
      targetCamPos.current.set(-2, 22, 34);
      targetLookAt.current.set(-2, 2, 0);
      return;
    }

    if (cameraPreset === "Kanban") {targetCamPos.current.set(0,5,-3);targetLookAt.current.set(0,4.2,-16.45);return;}
    if (cameraPreset === "Queue") {
      targetCamPos.current.set(-26, 8, 14);
      targetLookAt.current.set(-26, 2.2, 0);
      return;
    } else if (cameraPreset === "Completed") {
      targetCamPos.current.set(27, 8, 14);
      targetLookAt.current.set(27, 2.2, 0);
      return;
    } else if (cameraPreset.startsWith("Station ")) {
      const num = cameraPreset.split(" ")[1];
      const stationKey = `STATION-${num}`;
      if (STATION_COORDINATES[stationKey]) {
        focusX = STATION_COORDINATES[stationKey][0];
      }
    }

    targetCamPos.current.set(focusX, 6.8, 13);
    targetLookAt.current.set(focusX, 2.2, 0);
  }, [cameraPreset]);

  // If a station is selected via click, smoothly adjust camera to it
  useEffect(() => {
    if (selectedStationId && STATION_COORDINATES[selectedStationId]) {
      const focusX = STATION_COORDINATES[selectedStationId][0];
      targetCamPos.current.set(focusX, 6.5, 14);
      targetLookAt.current.set(focusX, 2.2, 0);
    }
  }, [selectedStationId]);

  useFrame((_, delta) => {
    if (controlsRef.current) {
      // Lerp camera position
      camera.position.lerp(targetCamPos.current, THREE.MathUtils.clamp(delta * 3.5, 0, 1));
      // Lerp controls target
      controlsRef.current.target.lerp(targetLookAt.current, THREE.MathUtils.clamp(delta * 4, 0, 1));
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2.05} // prevent going below floor
      minDistance={6}
      maxDistance={70}
      makeDefault
    />
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useAssemblyStore } from "@/store/assemblyStore";
import { STATION_COORDINATES } from "@/simulation/simulationEngine";

// Collision AABBs [minX, maxX, minZ, maxZ]
const COLLIDERS = [
  // Outer Factory Walls
  { minX: -40, maxX: -36, minZ: -20, maxZ: 20 }, // West wall
  { minX: 36, maxX: 40, minZ: -20, maxZ: 20 },  // East wall
  { minX: -40, maxX: 40, minZ: -20, maxZ: -16 }, // North wall
  { minX: -40, maxX: 40, minZ: 16, maxZ: 20 },  // South wall

  // Central Assembly Line Conveyor & Station Bases
  { minX: -21, maxX: 21, minZ: -2.3, maxZ: 2.3 },

  // Queue Bay Staging & Equipment
  { minX: -34, maxX: -23, minZ: -2.5, maxZ: 2.5 },

  // Completed Bay Staging & Equipment
  { minX: 25, maxX: 34, minZ: -2.5, maxZ: 2.5 },

  // Physical Kanban Board Foundation
  { minX: -5.5, maxX: 5.5, minZ: -15.8, maxZ: -13.0 },

  // Queue Terminal Workstation
  { minX: -26.5, maxX: -23.5, minZ: 3.5, maxZ: 5.5 },
];

function checkCollision(x: number, z: number, radius = 0.5): boolean {
  for (const c of COLLIDERS) {
    if (
      x + radius > c.minX &&
      x - radius < c.maxX &&
      z + radius > c.minZ &&
      z - radius < c.maxZ
    ) {
      return true;
    }
  }
  return false;
}

export function FirstPersonController() {
  const { camera } = useThree();
  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const viewMode = useAssemblyStore((s) => s.viewMode);
  const activeModal = useAssemblyStore((s) => s.activeModal);
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const queueRackIds = useAssemblyStore((s) => s.queueRackIds);
  const setPlayerPos = useAssemblyStore((s) => s.setPlayerPos);
  const setActivePrompt = useAssemblyStore((s) => s.setActivePrompt);
  const openModal = useAssemblyStore((s) => s.openModal);

  // Movement key states
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Current player position (Y = 1.7 eye height)
  const pos = useRef(new THREE.Vector3(0, 1.7, 10));

  // Initialize camera
  useEffect(() => {
    if (viewMode === "WALK") {
      camera.position.copy(pos.current);
    }
  }, [viewMode, camera]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeModal !== "NONE") return;

      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = true;
          break;
        case "KeyE": {
          // Trigger closest interactable
          const prompt = useAssemblyStore.getState().activePrompt;
          if (prompt) {
            if (controlsRef.current?.isLocked) {
              controlsRef.current.unlock();
            }
            if (prompt.targetType === "KANBAN") {
              openModal("KANBAN");
            } else if (prompt.targetType === "QUEUE_TERMINAL") {
              openModal("ADD_RACK");
            } else if (prompt.targetType === "STATION" && prompt.targetId) {
              openModal("STATION", prompt.targetId);
            } else if (prompt.targetType === "RACK" && prompt.targetId) {
              openModal("RACK", prompt.targetId);
            }
          }
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.right = false;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeModal, openModal]);

  // Frame Loop: WASD walking + collision sliding + proximity prompt check
  useFrame((_, delta) => {
    if (viewMode !== "WALK" || activeModal !== "NONE") return;

    const isLocked = controlsRef.current?.isLocked;
    const moveSpeed = 6.0; // meters per second

    if (isLocked) {
      // Calculate movement vector relative to camera direction
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();

      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      right.crossVectors(camera.up, forward).normalize(); // Strafe vector

      const moveDir = new THREE.Vector3(0, 0, 0);

      if (keys.current.forward) moveDir.add(forward);
      if (keys.current.backward) moveDir.sub(forward);
      if (keys.current.left) moveDir.add(right);
      if (keys.current.right) moveDir.sub(right);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const step = moveDir.multiplyScalar(moveSpeed * Math.min(delta, 0.05));

        // Proposed new position
        const targetX = pos.current.x + step.x;
        const targetZ = pos.current.z + step.z;

        // Axis-separated collision test (enables smooth wall sliding)
        if (!checkCollision(targetX, pos.current.z)) {
          pos.current.x = targetX;
        }
        if (!checkCollision(pos.current.x, targetZ)) {
          pos.current.z = targetZ;
        }

        camera.position.x = pos.current.x;
        camera.position.z = pos.current.z;
        camera.position.y = 1.7; // Fixed human eye height

        setPlayerPos([pos.current.x, pos.current.y, pos.current.z]);
      }
    }

    // --- PROXIMITY DETECTION SYSTEM ---
    const px = pos.current.x;
    const pz = pos.current.z;

    let nearestPrompt: {
      label: string;
      actionKey: "E";
      targetType: "STATION" | "RACK" | "KANBAN" | "QUEUE_TERMINAL";
      targetId?: string;
    } | null = null;
    let minDistance = 999;

    // 1. Check Physical Kanban Board: at [0, 0, -14]
    const distToKanban = Math.hypot(px - 0, pz - (-14));
    if (distToKanban < 4.8 && distToKanban < minDistance) {
      minDistance = distToKanban;
      nearestPrompt = {
        label: "Open Live Kanban Board",
        actionKey: "E",
        targetType: "KANBAN",
      };
    }

    // 2. Check Queue Terminal Workstation: at [-25, 0, 4.5]
    const distToTerminal = Math.hypot(px - (-25), pz - 4.5);
    if (distToTerminal < 3.8 && distToTerminal < minDistance) {
      minDistance = distToTerminal;
      nearestPrompt = {
        label: "Add GPU Rack to Queue",
        actionKey: "E",
        targetType: "QUEUE_TERMINAL",
      };
    }

    // 3. Check Stations 1 to 5
    for (const stn of stations) {
      const sx = stn.position[0];
      const sz = stn.position[2];
      const dist = Math.hypot(px - sx, pz - sz);
      if (dist < 4.2 && dist < minDistance) {
        minDistance = dist;
        nearestPrompt = {
          label: `Inspect Station ${stn.number}: ${stn.name.substring(0, 18)}`,
          actionKey: "E",
          targetType: "STATION",
          targetId: stn.id,
        };
      }
    }

    // 4. Check Racks near player
    for (const rack of Object.values(racks)) {
      let rx = 0;
      let rz = 0;
      if (rack.currentStationId && STATION_COORDINATES[rack.currentStationId]) {
        rx = STATION_COORDINATES[rack.currentStationId][0];
        rz = 0;
      } else if (rack.status === "QUEUED") {
        const qIdx = queueRackIds.indexOf(rack.id);
        rx = -24 - (qIdx >= 0 ? qIdx : 0) * 2.8;
        rz = 0;
      } else if (rack.status === "COMPLETED") {
        rx = 27;
        rz = 0;
      } else {
        continue;
      }

      const dist = Math.hypot(px - rx, pz - rz);
      if (dist < 3.2 && dist < minDistance) {
        minDistance = dist;
        nearestPrompt = {
          label: `Inspect ${rack.id} (${rack.modelName.substring(0, 16)})`,
          actionKey: "E",
          targetType: "RACK",
          targetId: rack.id,
        };
      }
    }

    setActivePrompt(nearestPrompt);
  });

  if (viewMode !== "WALK") return null;

  return (
    <PointerLockControls
      ref={controlsRef}
      pointerSpeed={0.8}
    />
  );
}

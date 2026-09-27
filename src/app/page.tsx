"use client";

import React, { useEffect } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import { FactoryViewer } from "@/components/factory/FactoryViewer";
import { FactoryHUD } from "@/components/hud/FactoryHUD";
import { EnterFactoryScreen } from "@/components/modals/EnterFactoryScreen";
import { KanbanModal } from "@/components/modals/KanbanModal";
import { StationInspectModal } from "@/components/modals/StationInspectModal";
import { RackDetailModal } from "@/components/racks/RackDetailModal";
import { AddRackModal } from "@/components/modals/AddRackModal";

export default function Home() {
  const initialize = useAssemblyStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#cbd5e1] select-none">
      {/* 1. Full-Screen 3D Interactive Virtual Factory Floor */}
      <FactoryViewer />

      {/* 2. Unobtrusive Minimalist Factory HUD (Crosshair, [E] prompt, Mode Switch, Minimap) */}
      <FactoryHUD />

      {/* 3. Welcome Briefing & POV Controls */}
      <EnterFactoryScreen />

      {/* 4. Contextual Context-Activated Modals */}
      <KanbanModal />
      <StationInspectModal />
      <RackDetailModal />
      <AddRackModal />
    </main>
  );
}

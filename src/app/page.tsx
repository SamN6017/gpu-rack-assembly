"use client";

import React, { useEffect } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import { FactoryViewer } from "@/components/factory/FactoryViewer";
import { FactoryHUD } from "@/components/hud/FactoryHUD";
import { EnterFactoryScreen } from "@/components/modals/EnterFactoryScreen";
import { KanbanModal } from "@/components/modals/KanbanModal";
import { StationInspectModal } from "@/components/modals/StationInspectModal";
import { RackDetailModal } from "@/components/racks/RackDetailModal";
import { FactoryPlayback } from "@/components/factory/FactoryPlayback";
import { AddRackModal } from "@/components/modals/AddRackModal";

export default function Home() {
  const initialize = useAssemblyStore((s) => s.initialize);

  useEffect(() => {
    initialize();
    return () => useAssemblyStore.getState().dispose();
  }, [initialize]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#cbd5e1] select-none">
      <a href="/data-sources" className="absolute bottom-5 left-5 z-40 rounded-lg bg-slate-950 px-4 py-2 text-sm text-cyan-300 shadow-lg">Operations ↗</a>
      {/* 1. Full-Screen 3D Interactive Virtual Factory Floor */}
      <FactoryViewer />

      {/* 2. Unobtrusive Minimalist Factory HUD (Crosshair, [E] prompt, Mode Switch, Minimap) */}
      <FactoryHUD />
      <FactoryPlayback />

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

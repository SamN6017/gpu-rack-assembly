"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import with ssr: false for WebGL Three.js canvas
const FactorySceneDynamic = dynamic(
  () => import("@/three/FactoryScene").then((mod) => mod.FactoryScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#cbd5e1] text-slate-700 font-mono space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs font-semibold tracking-wider">
          LOADING 3D VIRTUAL GPU ASSEMBLY CELL...
        </span>
      </div>
    ),
  }
);

export function FactoryViewer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#cbd5e1] text-slate-700 font-mono text-xs">
        INITIALIZING DIGITAL TWIN...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#cbd5e1] overflow-hidden">
      <FactorySceneDynamic />
    </div>
  );
}

"use client";

import type { BinState } from "@/simulation/core/kanban";
import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";

export interface KanbanMaterialItem {
  id: string;
  partNumber: string;
  description: string;
  station: number;
  unit: string;
  quantityPerRack: number;
  binsCount: number;
  binCapacity: number;
  reorderPoint: number;
  safetyStock: number;
  leadMinutes: number;
  sourceReference: string;
  warehouse: number;
  warehouseReserved: number;
  onHand: number;
  reserved: number;
  inTransit: number;
  onOrder: number;
  consumed: number;
  shortages: number;
  upstreamShortage: boolean;
  netPosition: number;
  bins: BinState[];
  coverageWorkingDays: number | null;
  status: "SHORTAGE" | "REPLENISHING" | "AVAILABLE";
}

interface MaterialBoardProps {
  materials: KanbanMaterialItem[];
}

export function MaterialBoard({ materials }: MaterialBoardProps) {
  if (!materials.length) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
        No materials match the active filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {materials.map((m) => {
        const stationName = workstationDefaults[m.station]?.name || `Station ${m.station + 1}`;
        const isShortage = m.status === "SHORTAGE";
        const isReplenishing = m.status === "REPLENISHING";

        return (
          <div
            key={m.id}
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              isShortage
                ? "bg-rose-950/20 border-rose-800/60 shadow-lg shadow-rose-950/20"
                : isReplenishing
                  ? "bg-amber-950/20 border-amber-800/60"
                  : "bg-slate-900/80 border-slate-800"
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                    STATION {m.station + 1} · {stationName}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{m.partNumber}</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isShortage
                      ? "bg-rose-900/50 text-rose-300 border-rose-700"
                      : isReplenishing
                        ? "bg-amber-900/50 text-amber-300 border-amber-700"
                        : "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{m.description}</p>

              {/* Point-of-Use Bins Visualization */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
                  <span>Point-of-Use Bins ({m.binsCount} × {m.binCapacity} {m.unit})</span>
                  <span className="text-slate-400 font-mono">
                    {m.onHand} / {m.binsCount * m.binCapacity} {m.unit}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {m.bins.map((bin) => {
                    const statusColors = {
                      FULL: "border-emerald-600/70 bg-emerald-950/40 text-emerald-300",
                      ACTIVE: "border-sky-600/70 bg-sky-950/40 text-sky-300",
                      REPLENISHING: "border-amber-600/70 bg-amber-950/40 text-amber-300",
                      EMPTY: "border-rose-600/70 bg-rose-950/40 text-rose-300",
                    };

                    const barColor = {
                      FULL: "bg-emerald-500",
                      ACTIVE: "bg-sky-500",
                      REPLENISHING: "bg-amber-500",
                      EMPTY: "bg-rose-500",
                    };

                    const pct = Math.min(100, (bin.quantity / bin.capacity) * 100);

                    return (
                      <div
                        key={bin.binIndex}
                        className={`p-2 rounded-lg border flex flex-col justify-between ${
                          statusColors[bin.status]
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>Bin #{bin.binIndex}</span>
                          <span className="uppercase text-[9px]">{bin.status}</span>
                        </div>
                        <div className="my-1.5">
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColor[bin.status]} transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-right">
                          {bin.quantity} / {bin.capacity} {m.unit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inventory Position Stats */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Warehouse</span>
                  <span className="font-mono text-slate-200">{m.warehouse}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">In Transit</span>
                  <span className="font-mono text-slate-200">{m.inTransit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Consumed</span>
                  <span className="font-mono text-slate-200">{m.consumed}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Reserved</span>
                  <span className="font-mono text-slate-200">{m.reserved}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Reorder Point</span>
                  <span className="font-mono text-slate-200">{m.reorderPoint}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Lead Time</span>
                  <span className="font-mono text-slate-200">{m.leadMinutes}m</span>
                </div>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>
                Coverage:{" "}
                <strong className="text-slate-200 font-mono">
                  {m.coverageWorkingDays !== null
                    ? `${m.coverageWorkingDays} days`
                    : "No demand"}
                </strong>
              </span>
              {m.upstreamShortage && (
                <span className="text-rose-400 font-bold">⚠ Warehouse Exhausted</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

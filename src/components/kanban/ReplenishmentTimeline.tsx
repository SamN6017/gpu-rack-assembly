"use client";

import type { Replenishment } from "@/simulation/core/types";

interface ReplenishmentTimelineProps {
  orders: Replenishment[];
  materialsById?: Record<string, { partNumber: string; unit: string }>;
}

export function ReplenishmentTimeline({
  orders,
  materialsById = {},
}: ReplenishmentTimelineProps) {
  if (!orders.length) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800 text-xs">
        No active replenishment orders in transit.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const mat = materialsById[o.materialId] || {
          partNumber: o.materialId,
          unit: "units",
        };

        const isDelivered = o.status === "DELIVERED";
        const isInTransit = o.status === "IN_TRANSIT";

        return (
          <div
            key={o.id}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] font-bold text-slate-400 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                {o.id}
              </span>
              <div>
                <strong className="text-slate-100">{mat.partNumber}</strong>
                <span className="text-slate-400 ml-2 font-mono">
                  {o.quantity} {mat.unit}
                </span>
                <span className="text-cyan-400 text-[11px] ml-2 font-medium">
                  Handler #{o.handler + 1}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>Req: {new Date(o.requested).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isInTransit || isDelivered ? "bg-amber-400" : "bg-slate-600"
                  }`}
                />
                <span>Pick: {new Date(o.dispatch).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDelivered ? "bg-emerald-400" : "bg-slate-600"
                  }`}
                />
                <span>Delivery: {new Date(o.delivery).toLocaleTimeString()}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  isDelivered
                    ? "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                    : isInTransit
                      ? "bg-amber-950/60 border-amber-700 text-amber-300"
                      : "bg-sky-950/60 border-sky-700 text-sky-300"
                }`}
              >
                {o.status}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

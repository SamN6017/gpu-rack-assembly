"use client";

interface InventoryChartsProps {
  consumption: Array<{ partNumber: string; unit: string; consumed: number }>;
  snapshots: Array<{ time: number; stocks: Array<{ id: string; onHand: number; warehouse: number }> }>;
  replenishmentFrequency: Array<{ partNumber: string; count: number }>;
  stockoutFrequency: Array<{ partNumber: string; count: number }>;
}

export function InventoryCharts({
  consumption,
  snapshots,
  replenishmentFrequency,
  stockoutFrequency,
}: InventoryChartsProps) {
  const maxConsumption = Math.max(1, ...consumption.map((c) => c.consumed));
  const maxReplenishments = Math.max(1, ...replenishmentFrequency.map((r) => r.count));
  const maxStockouts = Math.max(1, ...stockoutFrequency.map((s) => s.count));

  // Point-of-use and warehouse trend over time from snapshots
  const trendPoints = snapshots.slice(-30); // Last 30 snapshots for readability

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Consumption by Material */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Material Consumption
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {consumption.map((m) => (
            <div key={m.partNumber} className="grid grid-cols-[120px_1fr_60px] items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] truncate" title={m.partNumber}>
                {m.partNumber}
              </span>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${(m.consumed / maxConsumption) * 100}%` }}
                />
              </div>
              <span className="text-slate-200 font-mono text-right text-[11px]">
                {m.consumed} {m.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Replenishment Frequency */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Replenishment Order Cycles
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {replenishmentFrequency.map((r) => (
            <div key={r.partNumber} className="grid grid-cols-[120px_1fr_45px] items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] truncate">
                {r.partNumber}
              </span>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all"
                  style={{ width: `${(r.count / maxReplenishments) * 100}%` }}
                />
              </div>
              <span className="text-slate-200 font-mono text-right text-[11px] font-bold">
                {r.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Stockout Incident Frequency */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Stockout Incidents by Part
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {stockoutFrequency.map((s) => (
            <div key={s.partNumber} className="grid grid-cols-[120px_1fr_45px] items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] truncate">
                {s.partNumber}
              </span>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    s.count > 0 ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${s.count > 0 ? (s.count / maxStockouts) * 100 : 5}%` }}
                />
              </div>
              <span className={`font-mono text-right text-[11px] font-bold ${
                s.count > 0 ? "text-rose-400" : "text-emerald-400"
              }`}>
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Warehouse & POU Stock Trends */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Warehouse Drawdown Trend
        </h3>
        {!trendPoints.length ? (
          <p className="text-xs text-slate-500 py-6 text-center">No trend data available.</p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {trendPoints.map((tp, idx) => {
              const whTotal = tp.stocks.reduce((acc, st) => acc + st.warehouse, 0);
              const maxWh = Math.max(1, ...trendPoints.map((p) => p.stocks.reduce((acc, st) => acc + st.warehouse, 0)));
              const dateLabel = new Date(tp.time).toISOString().slice(0, 10);

              return (
                <div key={idx} className="grid grid-cols-[90px_1fr_60px] items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono text-[10px]">{dateLabel}</span>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(whTotal / maxWh) * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-300 font-mono text-right text-[10px]">
                    {Math.round(whTotal)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

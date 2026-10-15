"use client";

interface CoverageItem {
  partNumber: string;
  unit: string;
  onHand: number;
  coverageWorkingDays: number | null;
  reorderPoint: number;
}

interface CoverageChartProps {
  materials: CoverageItem[];
}

export function CoverageChart({ materials }: CoverageChartProps) {
  const activeMaterials = materials.filter((m) => m.coverageWorkingDays !== null);
  const maxDays = Math.max(1, ...activeMaterials.map((m) => m.coverageWorkingDays || 0));

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Working-Day Material Coverage
        </h3>
        <span className="text-[10px] text-slate-400">Zero-demand items excluded</span>
      </div>

      {!activeMaterials.length ? (
        <p className="text-xs text-slate-500 py-6 text-center">No active demand materials.</p>
      ) : (
        <div className="space-y-3">
          {activeMaterials.map((m) => {
            const days = m.coverageWorkingDays ?? 0;
            const isLow = days < 1;
            const isHealthy = days >= 2;

            return (
              <div key={m.partNumber} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{m.partNumber}</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isLow ? "text-rose-400" : isHealthy ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {days.toFixed(2)} work days ({m.onHand} {m.unit} on-hand)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isLow ? "bg-rose-500" : isHealthy ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, (days / maxDays) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

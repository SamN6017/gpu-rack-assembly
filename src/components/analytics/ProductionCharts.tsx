"use client";

interface ProductionChartsProps {
  daily: Record<string, number>;
  monthly: Record<string, number>;
}

function MiniBarChart({
  title,
  data,
  unit = "racks",
}: {
  title: string;
  data: Record<string, number>;
  unit?: string;
}) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h3>
        <span className="text-[10px] text-slate-400 font-mono">
          Total: {entries.reduce((a, [, b]) => a + b, 0)} {unit}
        </span>
      </div>

      {!entries.length ? (
        <p className="text-xs text-slate-500 py-6 text-center">No production recorded.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {entries.map(([label, val]) => (
            <div key={label} className="grid grid-cols-[100px_1fr_45px] items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px] truncate" title={label}>
                {label}
              </span>
              <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all"
                  style={{ width: `${(val / max) * 100}%` }}
                />
              </div>
              <span className="text-slate-200 font-mono text-right text-[11px] font-bold">
                {val}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductionCharts({ daily, monthly }: ProductionChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MiniBarChart title="Daily Rack Production" data={daily} />
      <MiniBarChart title="Monthly Rack Production" data={monthly} />
    </div>
  );
}

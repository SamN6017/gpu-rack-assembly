"use client";

import type { ScenarioComparisonResult } from "@/server/services/scenarioService";

interface ScenarioComparisonProps {
  comparison: ScenarioComparisonResult;
}

export function ScenarioComparison({ comparison }: ScenarioComparisonProps) {
  const { runs } = comparison;
  if (!runs.length) return null;

  const baseline = runs[0];
  const compared = runs.slice(1);

  const metricsConfig = [
    {
      key: "completedRacks" as const,
      label: "Completed Racks",
      higherIsBetter: true,
      format: (v: number) => v.toString(),
    },
    {
      key: "throughputPerWorkingHour" as const,
      label: "Throughput / Work Hour",
      higherIsBetter: true,
      format: (v: number) => `${v.toFixed(2)}/hr`,
    },
    {
      key: "stockoutCount" as const,
      label: "Stockout Incidents",
      higherIsBetter: false,
      format: (v: number) => v.toString(),
    },
    {
      key: "downtimeSeconds" as const,
      label: "Downtime (Hours)",
      higherIsBetter: false,
      format: (v: number) => `${(v / 3600).toFixed(1)} hrs`,
    },
    {
      key: "replenishmentCount" as const,
      label: "Replenishment Orders",
      higherIsBetter: null,
      format: (v: number) => v.toString(),
    },
    {
      key: "averageCycleMinutes" as const,
      label: "Avg Cycle Time",
      higherIsBetter: false,
      format: (v: number) => `${v.toFixed(1)} min`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Comparison Metrics Table */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Performance Comparison vs. Baseline ({baseline.name})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {runs.length} Scenarios Evaluated
          </span>
        </div>

        <div className="table-scroll overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">Performance Metric</th>
                <th className="py-2.5 px-3">
                  <span className="text-cyan-400 font-bold">Baseline:</span> {baseline.name}
                </th>
                {compared.map((r) => (
                  <th key={r.runId} className="py-2.5 px-3">
                    <span className="text-slate-200 font-bold">{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {metricsConfig.map((m) => (
                <tr key={m.key} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-3 font-sans font-medium text-slate-300">{m.label}</td>
                  <td className="py-3 px-3 text-slate-200 font-bold">
                    {m.format(baseline.kpis[m.key])}
                  </td>
                  {compared.map((r) => {
                    const val = r.kpis[m.key];
                    const delta = r.deltas ? r.deltas[m.key] : 0;
                    const isPositive = delta > 0;
                    const isZero = delta === 0;

                    let colorClass = "text-slate-400";
                    if (!isZero && m.higherIsBetter !== null) {
                      const isGood = m.higherIsBetter ? isPositive : !isPositive;
                      colorClass = isGood ? "text-emerald-400 font-bold" : "text-rose-400 font-bold";
                    }

                    return (
                      <td key={r.runId} className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-100">{m.format(val)}</span>
                          {!isZero && (
                            <span className={`text-[10px] ${colorClass}`}>
                              ({isPositive ? "+" : ""}
                              {m.key === "downtimeSeconds" ? (delta / 3600).toFixed(1) : delta})
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuration Overrides Breakdown */}
      {compared.map((r) => {
        const overrides = Object.entries(r.configOverrides || {});
        if (!overrides.length) return null;

        return (
          <div key={r.runId} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 mb-2">
              Parameter Overrides for <span className="text-cyan-400">{r.name}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {overrides.map(([key, val]) => (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono"
                >
                  <span className="text-[10px] uppercase font-sans text-slate-400 block truncate">
                    {key}
                  </span>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500 line-through">
                      {String(val.baseline)}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      → {String(val.override)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

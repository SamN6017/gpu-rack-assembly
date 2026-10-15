"use client";

export interface SimulationSummaryKPIs {
  completedRacks: number;
  wipRacks: number;
  queuedRacks: number;
  waitingForMaterial: number;
  throughputPerWorkingHour: number;
  averageCycleMinutes: number;
  stockoutCount: number;
  replenishmentCount: number;
  downtimeHours: number;
  scheduledWorkingHours: number;
  bottleneckStation: string | null;
}

interface SimulationSummaryProps {
  kpis: SimulationSummaryKPIs;
  scenarioName?: string;
  simulatedPeriod?: { start: string; end: string };
}

export function SimulationSummary({
  kpis,
  scenarioName,
  simulatedPeriod,
}: SimulationSummaryProps) {
  const cards = [
    {
      label: "Completed Racks",
      value: kpis.completedRacks,
      accent: "text-emerald-400",
      sub: "Produced to standard",
    },
    {
      label: "Active WIP",
      value: kpis.wipRacks,
      accent: "text-sky-400",
      sub: "In line workstations",
    },
    {
      label: "Waiting for Materials",
      value: kpis.waitingForMaterial,
      accent: kpis.waitingForMaterial > 0 ? "text-rose-400" : "text-slate-400",
      sub: "Blocked by buffer stock",
    },
    {
      label: "Throughput / Work Hour",
      value: kpis.throughputPerWorkingHour.toFixed(2),
      accent: "text-cyan-400",
      sub: "Racks / productive hr",
    },
    {
      label: "Average Cycle Time",
      value: `${kpis.averageCycleMinutes.toFixed(1)}m`,
      accent: "text-indigo-400",
      sub: "Start to complete",
    },
    {
      label: "Replenishments",
      value: kpis.replenishmentCount,
      accent: "text-amber-400",
      sub: "Warehouse to POU orders",
    },
    {
      label: "Stockout Incidents",
      value: kpis.stockoutCount,
      accent: kpis.stockoutCount > 0 ? "text-rose-400" : "text-emerald-400",
      sub: "Buffer shortage events",
    },
    {
      label: "Bottleneck Station",
      value: kpis.bottleneckStation || "None",
      accent: "text-amber-300",
      sub: "Highest downtime impact",
    },
  ];

  return (
    <div className="space-y-4">
      {scenarioName && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Scenario: <strong className="text-slate-200">{scenarioName}</strong>
          </span>
          {simulatedPeriod && (
            <span>
              {new Date(simulatedPeriod.start).toLocaleDateString()} –{" "}
              {new Date(simulatedPeriod.end).toLocaleDateString()} (UTC)
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {c.label}
            </span>
            <div className={`text-2xl font-black font-mono my-1 ${c.accent}`}>
              {c.value}
            </div>
            <span className="text-[10px] text-slate-500">{c.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

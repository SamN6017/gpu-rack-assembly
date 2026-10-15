"use client";

import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";

interface StationMetric {
  station: number;
  busySeconds: number;
  blockedSeconds: number;
  shortageSeconds: number;
  equipmentSeconds: number;
  utilization: number;
}

interface StationChartsProps {
  stations: StationMetric[];
  scheduledWorkingSeconds: number;
}

export function StationCharts({
  stations,
  scheduledWorkingSeconds,
}: StationChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Station Utilization Percentages */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Workstation Utilization
        </h3>
        <div className="space-y-3">
          {stations.map((s) => {
            const name = workstationDefaults[s.station - 1]?.name || `Station ${s.station}`;
            const pct = Math.min(100, Math.round(s.utilization * 100));

            return (
              <div key={s.station} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold truncate max-w-[200px]">
                    WS{s.station} · {name}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">{pct}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Downtime Hours by Cause */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-2">
          Downtime Breakdown (Hours)
        </h3>
        {(() => {
          const blockedHours = stations.reduce((a, s) => a + s.blockedSeconds, 0) / 3600;
          const shortageHours = stations.reduce((a, s) => a + s.shortageSeconds, 0) / 3600;
          const equipmentHours = stations.reduce((a, s) => a + s.equipmentSeconds, 0) / 3600;
          const totalDowntime = blockedHours + shortageHours + equipmentHours;
          const maxVal = Math.max(0.1, blockedHours, shortageHours, equipmentHours);

          const causes = [
            { label: "Downstream Blocked", value: blockedHours, color: "bg-amber-500" },
            { label: "Material Shortage Wait", value: shortageHours, color: "bg-rose-500" },
            { label: "Equipment Fault Downtime", value: equipmentHours, color: "bg-purple-500" },
          ];

          return (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400 mb-2">
                Total Downtime: <strong className="text-slate-200">{totalDowntime.toFixed(1)} hrs</strong>
              </div>
              {causes.map((c) => (
                <div key={c.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{c.label}</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {c.value.toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${c.color} rounded-full transition-all`}
                      style={{ width: `${(c.value / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

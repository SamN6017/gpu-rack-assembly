"use client";

import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";

export interface KanbanFilterState {
  search: string;
  station: string;
  status: string;
}

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  onChange: (filters: KanbanFilterState) => void;
  rackModelCode?: string;
}

export function KanbanFilters({
  filters,
  onChange,
  rackModelCode = "DEMO-GPU-RACK",
}: KanbanFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
      <label className="flex flex-col text-xs font-semibold text-slate-400 gap-1.5">
        Search Material
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Filter by part or description..."
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
        />
      </label>

      <label className="flex flex-col text-xs font-semibold text-slate-400 gap-1.5">
        Assembly Workstation
        <select
          value={filters.station}
          onChange={(e) => onChange({ ...filters, station: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
        >
          <option value="">All Workstations</option>
          {workstationDefaults.map((s, i) => (
            <option key={s.id} value={i.toString()}>
              {s.stationCode} · {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs font-semibold text-slate-400 gap-1.5">
        Stock Status
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 transition"
        >
          <option value="">All Statuses</option>
          <option value="SHORTAGE">Shortage (&lt; Required)</option>
          <option value="REPLENISHING">Replenishing In Flight</option>
          <option value="AVAILABLE">Sufficient Inventory</option>
        </select>
      </label>

      <label className="flex flex-col text-xs font-semibold text-slate-400 gap-1.5">
        Target Rack Model
        <input
          type="text"
          readOnly
          value={rackModelCode}
          className="px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 text-xs cursor-not-allowed"
        />
      </label>
    </div>
  );
}

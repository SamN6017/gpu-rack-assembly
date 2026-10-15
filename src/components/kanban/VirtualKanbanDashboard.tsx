"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAssemblyStore } from "@/store/assemblyStore";
import { deriveVirtualKanbanCards } from "@/services/virtualKanbanService";
import { VirtualKanbanBoard } from "./VirtualKanbanBoard";
import {
  Layers,
  Kanban,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Box,
  Truck,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Download,
  ShieldAlert,
  ChevronRight,
  Warehouse,
  Flame,
  Radio,
} from "lucide-react";

export function VirtualKanbanDashboard() {
  const mode = useAssemblyStore((s) => s.mode);
  const virtualTime = useAssemblyStore((s) => s.virtualTime);
  const manufacturing = useAssemblyStore((s) => s.manufacturing);
  const manufacturingConfig = useAssemblyStore((s) => s.manufacturingConfig);
  const stations = useAssemblyStore((s) => s.stations);
  const racks = useAssemblyStore((s) => s.racks);
  const metrics = useAssemblyStore((s) => s.metrics);
  const config = useAssemblyStore((s) => s.config);
  const events = useAssemblyStore((s) => s.events);

  const setPaused = useAssemblyStore((s) => s.setPaused);
  const setSpeed = useAssemblyStore((s) => s.setSpeed);
  const stepMinute = useAssemblyStore((s) => s.stepMinute);
  const resetSimulation = useAssemblyStore((s) => s.resetSimulation);
  const setOperatingMode = useAssemblyStore((s) => s.setOperatingMode);

  const [selectedStationIndex, setSelectedStationIndex] = useState<number | "ALL">(2); // Default to Station 3 (index 2) as requested in prompt!
  const [activeView, setActiveView] = useState<"dashboard" | "board">("dashboard");

  const isLive = mode === "LIVE";

  // Derive all active and completed virtual Kanban cards
  const kanbanCards = useMemo(() => {
    return deriveVirtualKanbanCards(manufacturing, manufacturingConfig);
  }, [manufacturing, manufacturingConfig]);

  // KPI Calculations
  const totalActiveRequests = useMemo(() => {
    return manufacturing?.orders.length ?? 0;
  }, [manufacturing]);

  const pendingReplenishments = useMemo(() => {
    return (
      manufacturing?.orders.filter(
        (o) => o.status === "REQUESTED" || (virtualTime && o.dispatch > virtualTime),
      ).length ?? 0
    );
  }, [manufacturing, virtualTime]);

  const inTransitCount = useMemo(() => {
    return (
      manufacturing?.orders.filter(
        (o) =>
          o.status === "IN_TRANSIT" ||
          (virtualTime && o.dispatch <= virtualTime && o.delivery > virtualTime),
      ).length ?? 0
    );
  }, [manufacturing, virtualTime]);

  const completedReplenishments = useMemo(() => {
    return kanbanCards.filter((c) => c.status === "REPLENISHMENT_COMPLETED").length;
  }, [kanbanCards]);

  const materialShortages = useMemo(() => {
    return (
      manufacturing?.stocks.reduce((acc, stk) => acc + (stk.shortages || 0), 0) ?? 0
    );
  }, [manufacturing]);

  const totalPouStock = useMemo(() => {
    return manufacturing?.stocks.reduce((acc, stk) => acc + stk.onHand, 0) ?? 0;
  }, [manufacturing]);

  const totalWarehouseStock = useMemo(() => {
    return manufacturing?.stocks.reduce((acc, stk) => acc + stk.warehouse, 0) ?? 0;
  }, [manufacturing]);

  const avgReplenishmentTime = useMemo(() => {
    if (!manufacturingConfig?.materials.length) return 15;
    const totalLead = manufacturingConfig.materials.reduce(
      (acc, m) => acc + m.leadMinutes,
      0,
    );
    return Number((totalLead / manufacturingConfig.materials.length).toFixed(1));
  }, [manufacturingConfig]);

  const assemblyDelaysMinutes = useMemo(() => {
    return Number(
      (
        (manufacturing?.shortageSeconds.reduce((acc, s) => acc + s, 0) ?? 0) /
        60
      ).toFixed(1),
    );
  }, [manufacturing]);

  const avgUtilization = useMemo(() => {
    if (!manufacturing?.busySeconds?.length) return 85;
    const totalBusy = manufacturing.busySeconds.reduce((acc, s) => acc + s, 0);
    const totalBlocked = manufacturing.blockedSeconds.reduce((acc, s) => acc + s, 0);
    const totalShortage = manufacturing.shortageSeconds.reduce((acc, s) => acc + s, 0);
    const totalTime = totalBusy + totalBlocked + totalShortage;
    return totalTime > 0 ? Number(((totalBusy / totalTime) * 100).toFixed(1)) : 85;
  }, [manufacturing]);

  // Workstation materials mapping
  const selectedStationMaterials = useMemo(() => {
    if (!manufacturingConfig?.materials || !manufacturing?.stocks) return [];
    return manufacturingConfig.materials
      .filter((m) => selectedStationIndex === "ALL" || m.station === selectedStationIndex)
      .map((m) => {
        const stock = manufacturing.stocks.find((s) => s.id === m.id);
        const onHand = stock?.onHand ?? 0;
        const reserved = stock?.reserved ?? 0;
        const warehouse = stock?.warehouse ?? 0;
        const warehouseReserved = stock?.warehouseReserved ?? 0;
        const reorderPoint = m.reorderPoint;
        const capacity = m.bins * m.binCapacity;
        const isReordering = (stock?.onOrder ?? 0) > 0;
        const isShortage = onHand <= m.safetyStock;

        return {
          id: m.id,
          partNumber: m.partNumber,
          description: m.description,
          stationNumber: m.station + 1,
          unitOfMeasure: m.unit,
          onHand,
          reserved,
          capacity,
          reorderPoint,
          replenishBatch: m.bins * m.binCapacity,
          warehouse,
          warehouseReserved,
          shortages: stock?.shortages ?? 0,
          consumed: stock?.consumed ?? 0,
          isReordering,
          isShortage,
        };
      });
  }, [manufacturingConfig, manufacturing, selectedStationIndex]);

  // Filtered active Kanban orders for selected station
  const stationActiveOrders = useMemo(() => {
    if (!manufacturing?.orders) return [];
    return manufacturing.orders.filter((o) => {
      if (selectedStationIndex === "ALL") return true;
      const mat = manufacturingConfig?.materials.find((m) => m.id === o.materialId);
      return mat && mat.station === selectedStationIndex;
    });
  }, [manufacturing, manufacturingConfig, selectedStationIndex]);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (!manufacturing || !manufacturingConfig) return;
    const rows: string[][] = [
      ["VIRTUAL KANBAN AUDIT & REPLENISHMENT REPORT"],
      ["Generated", new Date().toISOString()],
      ["Simulation Mode", mode],
      ["Simulation Timestamp", virtualTime ? new Date(virtualTime).toISOString() : "N/A"],
      [],
      ["--- WORKSTATION INVENTORY LEVELS ---"],
      [
        "Station",
        "Part Number",
        "Description",
        "Point of Use On Hand",
        "Reserved",
        "Capacity",
        "Reorder Point",
        "Replenish Quantity",
        "Warehouse Stock",
        "Warehouse Reserved",
        "Total Consumed",
        "Shortage Events",
      ],
      ...selectedStationMaterials.map((m) => [
        `Station ${m.stationNumber}`,
        m.partNumber,
        m.description,
        m.onHand.toString(),
        m.reserved.toString(),
        m.capacity.toString(),
        m.reorderPoint.toString(),
        m.replenishBatch.toString(),
        m.warehouse.toString(),
        m.warehouseReserved.toString(),
        m.consumed.toString(),
        m.shortages.toString(),
      ]),
      [],
      ["--- ACTIVE KANBAN REPLENISHMENT ORDERS ---"],
      [
        "Order ID",
        "Material ID",
        "Quantity",
        "Requested Virtual Time",
        "Dispatch Virtual Time",
        "Delivery Virtual Time",
        "Assigned Material Handler",
        "Status",
      ],
      ...manufacturing.orders.map((o) => [
        o.id,
        o.materialId,
        o.quantity.toString(),
        new Date(o.requested).toISOString(),
        new Date(o.dispatch).toISOString(),
        new Date(o.delivery).toISOString(),
        `AGV-${(o.handler % 4) + 1}`,
        o.status,
      ]),
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","),
        )
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kanban-inventory-audit-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Header & Navigation */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
                <Kanban className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Virtual Kanban Management System
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono border border-cyan-500/40 bg-cyan-950/50 text-cyan-300">
                    DIGITAL TWIN
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated pull replenishment, point-of-use inventory tracking, and warehouse AGV dispatch
                </p>
              </div>
            </div>
          </div>

          {/* Dual Operating Mode Switcher & Twin Link */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-xs font-mono">
              <button
                onClick={() => setOperatingMode("SIMULATION")}
                className={`px-3 py-1 rounded transition-colors ${
                  !isLive
                    ? "bg-cyan-600 text-white font-bold shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Simulation Mode
              </button>
              <button
                onClick={() => setOperatingMode("LIVE")}
                className={`px-3 py-1 rounded transition-colors ${
                  isLive
                    ? "bg-emerald-600 text-white font-bold shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Live Operations
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export CSV
            </button>

            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-700 text-xs font-semibold text-cyan-300 transition-colors"
            >
              3D Factory Twin ↗
            </Link>
          </div>
        </div>

        {/* Mode Warning / Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            isLive
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-amber-950/30 border-amber-500/40 text-amber-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {isLive ? (
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {isLive ? (
                <>
                  <strong>MODE 2: LIVE OPERATIONS (READ-ONLY)</strong> — Displaying real-time shop floor status via external ERP / WMS adapter. Outbound manual simulation control is locked.
                </>
              ) : (
                <>
                  <strong>MODE 1: SYNTHETIC SIMULATION</strong> — Synthetic demonstration twin data. Station operations consume finite demonstration stocks. Do not treat as verified factory inventory.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-300 shrink-0 pl-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {virtualTime ? new Date(virtualTime).toUTCString().slice(17, 25) : "08:00:00"} UTC
            </span>
          </div>
        </div>

        {/* View Switcher: Analytics Dashboard vs Digital Board */}
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setActiveView("dashboard")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold transition-all ${
                activeView === "dashboard"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Workstation Analytics & Inventory
            </button>
            <button
              onClick={() => setActiveView("board")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold transition-all ${
                activeView === "board"
                  ? "bg-sky-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              7-Stage Digital Kanban Board
            </button>
          </div>

          {/* Quick Simulation Bar (if in simulation mode) */}
          {!isLive && (
            <div className="flex items-center space-x-2 text-xs font-mono">
              <button
                onClick={() => setPaused(!config.isPaused)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center gap-1"
              >
                {config.isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                {config.isPaused ? "Play" : "Pause"}
              </button>
              <button
                onClick={stepMinute}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
              >
                +1 min
              </button>
              <button
                onClick={resetSimulation}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <select
                aria-label="Simulation speed multiplier"
                value={config.speedMultiplier}
                onChange={(e) => setSpeed(Number(e.target.value) as 1 | 2 | 5 | 10 | 60)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-1 text-xs"
              >
                {[1, 2, 5, 10, 60].map((s) => (
                  <option key={s} value={s}>{s}×</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* TOP KPI CARDS (10 Key Manufacturing Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Active Requests
              <Kanban className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {totalActiveRequests}
            </div>
            <span className="text-[10px] text-cyan-400/90 mt-0.5 block">
              {inTransitCount} in transit · {pendingReplenishments} picking
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Pending Pick
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
              {pendingReplenishments}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Warehouse staging queue
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Completed Pulls
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {completedReplenishments}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Delivered to workstations
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border transition-colors ${
            materialShortages > 0
              ? "bg-rose-950/40 border-rose-600/60"
              : "bg-slate-900/80 border-slate-800"
          }`}>
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Material Shortages
              <AlertTriangle className={`w-3.5 h-3.5 ${materialShortages > 0 ? "text-rose-400" : "text-slate-500"}`} />
            </span>
            <div className={`text-2xl font-bold mt-1 font-mono ${materialShortages > 0 ? "text-rose-400" : "text-slate-300"}`}>
              {materialShortages}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Assembly stockout episodes
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Avg Lead Time
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            </span>
            <div className="text-2xl font-bold text-sky-300 mt-1 font-mono">
              {avgReplenishmentTime}m
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Warehouse to line lead
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Shortage Delays
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </span>
            <div className="text-2xl font-bold text-amber-300 mt-1 font-mono">
              {assemblyDelaysMinutes}m
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Cumulative station block
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Completed Racks
              <Box className="w-3.5 h-3.5 text-cyan-400" />
            </span>
            <div className="text-2xl font-bold text-white mt-1 font-mono">
              {manufacturing?.completed ?? metrics.completedToday}
            </div>
            <span className="text-[10px] text-cyan-400/80 mt-0.5 block">
              Quality-tested GPU racks
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Line Utilization
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
              {avgUtilization}%
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Active productive work
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              POU Workstation Stock
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            </span>
            <div className="text-2xl font-bold text-purple-300 mt-1 font-mono">
              {totalPouStock.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Units across 5 stations
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              Central Warehouse
              <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
            </span>
            <div className="text-2xl font-bold text-indigo-300 mt-1 font-mono">
              {totalWarehouseStock.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Stock available for pull
            </span>
          </div>
        </div>

        {/* MAIN BODY: DASHBOARD TAB */}
        {activeView === "dashboard" ? (
          <div className="space-y-6">
            {/* Workstation Selection Pills */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400 font-mono mr-2">Workstation Filter:</span>
              <button
                onClick={() => setSelectedStationIndex("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedStationIndex === "ALL"
                    ? "bg-cyan-600 text-white shadow"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                All Workstations (1-5)
              </button>

              {[
                { idx: 0, name: "Station 1: Chassis Prep" },
                { idx: 1, name: "Station 2: Motherboards & Busbar" },
                { idx: 2, name: "Station 3: GPU Sleds & Heatsinks" },
                { idx: 3, name: "Station 4: Power & Manifolds" },
                { idx: 4, name: "Station 5: Leak Check & Final Telemetry" },
              ].map((st) => (
                <button
                  key={st.idx}
                  onClick={() => setSelectedStationIndex(st.idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedStationIndex === st.idx
                      ? "bg-cyan-600 text-white shadow ring-2 ring-cyan-500/30"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>

            {/* Selected Workstation Detailed Header & Summary */}
            {selectedStationIndex !== "ALL" && (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg">
                    {selectedStationIndex + 1}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      Workstation {selectedStationIndex + 1} Point-of-Use Telemetry
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          stations[selectedStationIndex]?.status === "RUNNING"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : stations[selectedStationIndex]?.status === "BLOCKED"
                            ? "bg-rose-950 text-rose-400 border border-rose-800 animate-pulse"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {stations[selectedStationIndex]?.status || "IDLE"}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Active rack:{" "}
                      {stations[selectedStationIndex]?.rackId ? (
                        <strong className="text-cyan-300">
                          {racks[stations[selectedStationIndex]!.rackId!]?.modelName || "GPU-RACK-GEN5"} ({stations[selectedStationIndex]!.rackId})
                        </strong>
                      ) : (
                        <span className="text-slate-500">None in bay</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Station Shortages</span>
                    <strong className={selectedStationMaterials.some((m) => m.shortages > 0) ? "text-rose-400" : "text-emerald-400"}>
                      {selectedStationMaterials.reduce((acc, m) => acc + m.shortages, 0)} incidents
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase">Active Replenishments</span>
                    <strong className="text-cyan-400">
                      {stationActiveOrders.length} in pipeline
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* ASSIGNED MATERIALS & POINT-OF-USE INVENTORY TABLE */}
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Assigned Materials & Buffer Inventory
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live Point-of-Use (POU) on-hand vs reorder thresholds and replenishment trigger points
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {selectedStationMaterials.length} configured BOM parts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Station</th>
                      <th className="p-3">Part Number</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">On-Hand / Cap</th>
                      <th className="p-3">Level Meter</th>
                      <th className="p-3">Reserved</th>
                      <th className="p-3">Reorder Point</th>
                      <th className="p-3">Batch Size</th>
                      <th className="p-3">Warehouse Stock</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedStationMaterials.map((m) => {
                      const fillPct = Math.min(100, Math.round((m.onHand / (m.capacity || 1)) * 100));
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-cyan-400 font-bold">WS-{m.stationNumber}</td>
                          <td className="p-3 font-bold text-white">{m.partNumber}</td>
                          <td className="p-3 text-slate-300 max-w-xs truncate" title={m.description}>
                            {m.description}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-100">{m.onHand}</span>
                            <span className="text-slate-500"> / {m.capacity} {m.unitOfMeasure}</span>
                          </td>
                          <td className="p-3 w-32">
                            <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  m.isShortage
                                    ? "bg-rose-500"
                                    : m.onHand <= m.reorderPoint
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-slate-400">{m.reserved}</td>
                          <td className="p-3 text-amber-300 font-semibold">{m.reorderPoint}</td>
                          <td className="p-3 text-cyan-300">+{m.replenishBatch}</td>
                          <td className="p-3">
                            <span className="text-indigo-300 font-semibold">{m.warehouse}</span>
                            {m.warehouseReserved > 0 && (
                              <span className="text-[10px] text-amber-400 block">
                                ({m.warehouseReserved} resv)
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {m.isShortage ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700">
                                SHORTAGE
                              </span>
                            ) : m.isReordering ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
                                REPLENISHING
                              </span>
                            ) : m.onHand <= m.reorderPoint ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-950 text-yellow-300 border border-yellow-700">
                                BELOW REORDER
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                                OPTIMAL
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTIVE KANBAN REPLENISHMENTS & MATERIAL HANDLER AGV PIPELINE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Kanban Orders */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Truck className="w-4 h-4 text-cyan-400" />
                    Active Pull Replenishment Orders
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">
                    {stationActiveOrders.length} active
                  </span>
                </div>

                {!stationActiveOrders.length ? (
                  <p className="text-xs text-slate-500 py-8 text-center font-mono">
                    All point-of-use bins currently satisfy reorder thresholds. No pending Kanban orders.
                  </p>
                ) : (
                  <div className="space-y-2.5 mt-3 max-h-64 overflow-y-auto pr-1">
                    {stationActiveOrders.map((o) => {
                      const mat = manufacturingConfig?.materials.find((m) => m.id === o.materialId);
                      const isDelivered = virtualTime ? o.delivery <= virtualTime : false;
                      const isInTransit = virtualTime ? o.dispatch <= virtualTime && !isDelivered : false;

                      return (
                        <div
                          key={o.id}
                          className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between font-mono text-xs"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-cyan-400">{o.id}</span>
                              <span className="text-slate-400">•</span>
                              <span className="font-semibold text-white">{mat?.partNumber || o.materialId}</span>
                              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                +{o.quantity} EA
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-1">
                              Target: Station {(mat?.station ?? 0) + 1} • Handler: AGV-{(o.handler % 4) + 1}
                            </span>
                          </div>

                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDelivered
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                  : isInTransit
                                  ? "bg-sky-950 text-sky-400 border border-sky-800 animate-pulse"
                                  : "bg-amber-950 text-amber-400 border border-amber-800"
                              }`}
                            >
                              {isDelivered ? "DELIVERED" : isInTransit ? "IN TRANSIT" : "PICKING"}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-1">
                              ETA: {new Date(o.delivery).toUTCString().slice(17, 22)} UTC
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Station Material Flow & Shortage Audit */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Material Consumption & Replenishment Audit
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    Live Event Stream
                  </span>
                </div>

                <div className="space-y-2 mt-3 max-h-64 overflow-y-auto pr-1">
                  {events
                    .filter((e) => selectedStationIndex === "ALL" || e.stationId === `station-${(selectedStationIndex as number) + 1}`)
                    .slice(-8)
                    .reverse()
                    .map((ev, i) => (
                      <div
                        key={i}
                        className="p-2 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-semibold text-slate-200">{ev.message}</span>
                          <span className="text-[10px] text-slate-500 block">
                            Rack: {ev.rackId} • {new Date(ev.timestamp).toUTCString().slice(17, 25)} UTC
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {ev.type}
                        </span>
                      </div>
                    ))}
                  {!events.length && (
                    <p className="text-xs text-slate-500 py-8 text-center font-mono">
                      No material consumption events recorded yet. Run simulation to populate.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DIGITAL KANBAN BOARD TAB */
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-4">
            <VirtualKanbanBoard />
          </div>
        )}
      </div>
    </div>
  );
}

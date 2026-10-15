"use client";

import React, { useState, useMemo } from "react";
import { useAssemblyStore } from "@/store/assemblyStore";
import {
  deriveVirtualKanbanCards,
  filterKanbanCards,
} from "@/services/virtualKanbanService";
import { KANBAN_STAGES, type VirtualKanbanCard, type KanbanStage } from "@/types/virtualKanban";
import {
  Layers,
  Search,
  Filter,
  Truck,
  Box,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  MapPin,
  RefreshCw,
  Cpu,
} from "lucide-react";

export function VirtualKanbanBoard() {
  const manufacturing = useAssemblyStore((s) => s.manufacturing);
  const manufacturingConfig = useAssemblyStore((s) => s.manufacturingConfig);
  const events = useAssemblyStore((s) => s.events);
  const virtualTime = useAssemblyStore((s) => s.virtualTime ?? Date.now());

  // Filter state
  const [stationFilter, setStationFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<KanbanStage | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"HIGH" | "NORMAL" | "LOW" | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCard, setSelectedCard] = useState<VirtualKanbanCard | null>(null);

  // Map events to SimEvent format for service
  const simEvents = useMemo(() => {
    return (events || []).map((e, idx) => ({
      sequence: idx + 1,
      time: e.timestamp,
      type: e.type as any,
      rackId: e.rackId,
      station: e.stationId ? parseInt(e.stationId.replace(/\D/g, "")) - 1 : undefined,
      orderId: e.rackId?.startsWith("REPL-") ? e.rackId : undefined,
      reason: e.message,
    }));
  }, [events]);

  const allCards = useMemo(() => {
    return deriveVirtualKanbanCards(manufacturing, manufacturingConfig, simEvents);
  }, [manufacturing, manufacturingConfig, simEvents]);

  const filteredCards = useMemo(() => {
    return filterKanbanCards(allCards, {
      workstation: stationFilter,
      materialQuery: searchQuery,
      status: statusFilter,
      priority: priorityFilter,
    });
  }, [allCards, stationFilter, searchQuery, statusFilter, priorityFilter]);

  // Group cards by stage
  const cardsByStage = useMemo(() => {
    const map: Record<KanbanStage, VirtualKanbanCard[]> = {
      MATERIAL_AVAILABLE: [],
      REPLENISHMENT_REQUIRED: [],
      REQUEST_CREATED: [],
      PICKING_FROM_WAREHOUSE: [],
      IN_TRANSIT: [],
      DELIVERED: [],
      REPLENISHMENT_COMPLETED: [],
    };
    for (const card of filteredCards) {
      if (map[card.status]) {
        map[card.status].push(card);
      }
    }
    return map;
  }, [filteredCards]);

  const activeReplenishmentsCount = useMemo(() => {
    return allCards.filter(
      (c) =>
        c.status === "REQUEST_CREATED" ||
        c.status === "PICKING_FROM_WAREHOUSE" ||
        c.status === "IN_TRANSIT",
    ).length;
  }, [allCards]);

  const highPriorityCount = useMemo(() => {
    return allCards.filter((c) => c.priority === "HIGH").length;
  }, [allCards]);

  return (
    <div className="flex flex-col h-full space-y-4 font-mono select-none">
      {/* Top Controls & Metrics Bar */}
      <div className="bg-[#090d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter part #, name, ID..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-52"
            />
          </div>

          {/* Workstation Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-500 text-[10px] uppercase font-bold px-1.5">Station:</span>
            {(["ALL", 0, 1, 2, 3, 4] as const).map((stn) => (
              <button
                key={String(stn)}
                onClick={() => setStationFilter(stn)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  stationFilter === stn
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {stn === "ALL" ? "All" : `S${stn + 1}`}
              </button>
            ))}
          </div>

          {/* Priority Selector */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span className="text-slate-400">Active Pulls:</span>
            <span className="font-bold text-sky-300">{activeReplenishmentsCount}</span>
          </div>
          {highPriorityCount > 0 && (
            <div className="flex items-center space-x-1.5 text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold">{highPriorityCount} Shortage Risk</span>
            </div>
          )}
          <div className="text-[11px] text-slate-500 border-l border-slate-800 pl-3">
            Simulation Clock:{" "}
            <span className="text-slate-300 font-bold">
              {new Date(virtualTime).toUTCString().slice(17, 25)} UTC
            </span>
          </div>
        </div>
      </div>

      {/* 7-Stage Digital Kanban Board Columns */}
      <div className="grid grid-cols-7 gap-3 flex-1 overflow-x-auto min-w-[1260px] pb-2">
        {KANBAN_STAGES.map((stage) => {
          const cards = cardsByStage[stage.key] || [];

          return (
            <div
              key={stage.key}
              className="flex flex-col bg-[#0b101d] border border-slate-800/90 rounded-xl overflow-hidden shadow-lg min-h-[520px]"
            >
              {/* Column Header */}
              <div
                className="p-3 border-b border-slate-800 flex items-center justify-between"
                style={{ borderTop: `3px solid ${stage.color}` }}
              >
                <div className="truncate pr-1">
                  <h3 className="text-xs font-bold text-slate-200 tracking-wide truncate">
                    {stage.label}
                  </h3>
                  <span className="text-[9px] text-slate-500 block truncate">
                    {stage.description}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${stage.color}20`,
                    color: stage.color,
                    border: `1px solid ${stage.color}50`,
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(88vh-230px)]">
                {cards.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-[11px] text-slate-600 italic border border-dashed border-slate-800/60 rounded-lg">
                    No active items
                  </div>
                ) : (
                  cards.map((card) => {
                    const isHigh = card.priority === "HIGH";
                    const isSelected = selectedCard?.id === card.id;

                    // Remaining time calculation
                    const remainingMs = Math.max(0, card.estimatedDeliveryTime - virtualTime);
                    const remainingMins = Math.ceil(remainingMs / 60000);

                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all duration-150 relative ${
                          isSelected
                            ? "bg-slate-900 border-sky-400 ring-1 ring-sky-400 shadow-lg"
                            : isHigh
                              ? "bg-rose-950/20 border-rose-800/70 hover:border-rose-600"
                              : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Top ID & Priority */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[10px] text-slate-400 font-mono">
                            {card.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              card.priority === "HIGH"
                                ? "bg-rose-950 text-rose-300 border-rose-700"
                                : card.priority === "NORMAL"
                                  ? "bg-amber-950 text-amber-300 border-amber-700"
                                  : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            {card.priority}
                          </span>
                        </div>

                        {/* Part Number & Name */}
                        <div className="font-bold text-slate-100 text-xs mb-0.5 truncate">
                          {card.partNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mb-2">
                          {card.materialName}
                        </div>

                        {/* Station Tag */}
                        <div className="flex items-center space-x-1 text-[10px] text-sky-400 font-bold bg-sky-950/40 border border-sky-900/60 px-1.5 py-0.5 rounded mb-2">
                          <Cpu className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{card.workstation}</span>
                        </div>

                        {/* Inventory & Quantity Meter */}
                        <div className="bg-slate-900/90 rounded p-1.5 border border-slate-800/80 mb-2 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Current POU:</span>
                            <span
                              className={`font-bold ${
                                card.currentInventory <= card.reorderThreshold
                                  ? "text-rose-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {card.currentInventory} {card.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Pull Quantity:</span>
                            <span className="font-bold text-cyan-300">
                              +{card.requestedQuantity} {card.unit}
                            </span>
                          </div>
                        </div>

                        {/* Location & Handler Assignment */}
                        <div className="space-y-0.5 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-2.5 h-2.5" />
                              POU Bin:
                            </span>
                            <span className="text-slate-300 font-mono text-[9px]">
                              {card.storageLocation}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-500">
                              <User className="w-2.5 h-2.5" />
                              Handler:
                            </span>
                            <span className="text-cyan-400 font-semibold text-[9px]">
                              {card.assignedHandler}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-2.5 h-2.5" />
                              ETA:
                            </span>
                            <span className="text-amber-300 font-bold text-[9px]">
                              {card.status === "REPLENISHMENT_COMPLETED"
                                ? "Delivered"
                                : remainingMins > 0
                                  ? `${remainingMins}m`
                                  : "Imminent"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Card Modal / Telemetry Flyout */}
      {selectedCard && (
        <div className="fixed inset-0 z-[120] isolate flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0c121e] border border-sky-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                  KANBAN DISPATCH TELEMETRY · {selectedCard.id}
                </span>
                <h3 className="text-base font-bold text-white">{selectedCard.partNumber}</h3>
                <p className="text-xs text-slate-400">{selectedCard.materialName}</p>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Target Station</span>
                <div className="text-slate-200 font-bold">{selectedCard.workstation}</div>
                <div className="text-[10px] text-slate-400">Bin: {selectedCard.storageLocation}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Source Warehouse</span>
                <div className="text-slate-200 font-bold">{selectedCard.warehouseLocation}</div>
                <div className="text-[10px] text-slate-400">Assigned: {selectedCard.assignedHandler}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Threshold Settings</span>
                <div className="text-slate-200">
                  Reorder Point: <strong className="text-amber-400">{selectedCard.reorderThreshold} {selectedCard.unit}</strong>
                </div>
                <div className="text-[10px] text-slate-400">
                  Safety Stock: {selectedCard.safetyStock} {selectedCard.unit}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Inventory Balances</span>
                <div className="text-slate-200">
                  On Hand: <strong className="text-emerald-400">{selectedCard.currentInventory} {selectedCard.unit}</strong>
                </div>
                <div className="text-[10px] text-cyan-400">
                  Replenishing: +{selectedCard.requestedQuantity} {selectedCard.unit}
                </div>
              </div>
            </div>

            <div className="bg-sky-950/30 border border-sky-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-sky-200">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Current Status: <strong>{selectedCard.status}</strong>
              </span>
              <span>
                Estimated Delivery: {new Date(selectedCard.estimatedDeliveryTime).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

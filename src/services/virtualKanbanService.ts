import type { Snapshot, SimulationConfig, SimEvent } from "@/simulation/core/types";
import { workstationDefaults } from "@/domain/manufacturing/workstationDefaults";
import type { VirtualKanbanCard, KanbanStage } from "@/types/virtualKanban";

export function deriveVirtualKanbanCards(
  snapshot: Snapshot | null | undefined,
  config: SimulationConfig | null | undefined,
  events: SimEvent[] = [],
): VirtualKanbanCard[] {
  if (!snapshot || !config) return [];

  const cards: VirtualKanbanCard[] = [];
  const now = snapshot.time;

  // Track completed order IDs to avoid duplicate rendering
  const completedOrderIds = new Set<string>();

  // 1. Process active materials across stations
  for (const m of config.materials) {
    const stock = snapshot.stocks.find((s) => s.id === m.id);
    if (!stock) continue;

    const stationMeta = workstationDefaults[m.station] || {
      name: `Station ${m.station + 1}`,
      stationCode: `STATION-${m.station + 1}`,
    };
    const stationRack = snapshot.stations[m.station];
    const isStationBlockedOnMaterial =
      stationRack?.status === "BLOCKED" && stationRack?.reason === "MATERIAL";

    // Find active order for this material
    const activeOrder = snapshot.orders.find((o) => o.materialId === m.id);

    // Determine priority
    let priority: "HIGH" | "NORMAL" | "LOW" = "LOW";
    if (stock.onHand <= m.safetyStock || stock.shortages > 0 || isStationBlockedOnMaterial) {
      priority = "HIGH";
    } else if (stock.onHand <= m.reorderPoint) {
      priority = "NORMAL";
    }

    // Determine lifecycle stage
    let stage: KanbanStage = "MATERIAL_AVAILABLE";
    let requestId = `KANBAN-${m.id}-SIG`;
    let reqQty = m.bins * m.binCapacity - stock.onHand;
    let reqTimestamp = now;
    let estDelivery = now + m.leadMinutes * 60000;
    let handlerLabel = "Unassigned";
    let dispatchTs: number | undefined;

    if (activeOrder) {
      requestId = activeOrder.id;
      reqQty = activeOrder.quantity;
      reqTimestamp = activeOrder.requested;
      dispatchTs = activeOrder.dispatch;
      estDelivery = activeOrder.delivery;
      handlerLabel = `Material Handler #${activeOrder.handler + 1}`;
      completedOrderIds.add(activeOrder.id);

      if (now >= activeOrder.delivery) {
        stage = "DELIVERED";
      } else if (activeOrder.status === "IN_TRANSIT" || now >= activeOrder.dispatch) {
        // If past dispatch time or in transit
        const pickWindow = (activeOrder.delivery - activeOrder.dispatch) * 0.35;
        if (now < activeOrder.dispatch + pickWindow) {
          stage = "PICKING_FROM_WAREHOUSE";
        } else {
          stage = "IN_TRANSIT";
        }
      } else {
        stage = "REQUEST_CREATED";
      }
    } else if (stock.onHand <= m.reorderPoint || isStationBlockedOnMaterial) {
      stage = "REPLENISHMENT_REQUIRED";
    }

    cards.push({
      id: requestId,
      requestId,
      materialId: m.id,
      materialName: m.description,
      partNumber: m.partNumber,
      workstation: `STN ${m.station + 1} · ${stationMeta.name}`,
      workstationIndex: m.station,
      storageLocation: `POU-STN-${m.station + 1}-BIN-1`,
      warehouseLocation: `WH-AISLE-${m.station + 1}-BAY-01`,
      currentInventory: stock.onHand,
      unit: m.unit,
      reorderThreshold: m.reorderPoint,
      safetyStock: m.safetyStock,
      binCapacity: m.binCapacity,
      binsCount: m.bins,
      requestedQuantity: Math.max(0, reqQty),
      requestTimestamp: reqTimestamp,
      priority,
      status: stage,
      assignedHandler: handlerLabel,
      estimatedDeliveryTime: estDelivery,
      dispatchTimestamp: dispatchTs,
    });
  }

  // 2. Add recent completed replenishment orders from historical event stream
  const completedEvents = events
    .filter((e) => e.type === "REPLENISHMENT_DELIVERED" && e.orderId && !completedOrderIds.has(e.orderId))
    .slice(-15);

  for (const ev of completedEvents) {
    if (!ev.materialId || !ev.orderId) continue;
    const m = config.materials.find((x) => x.id === ev.materialId);
    if (!m) continue;
    const stock = snapshot.stocks.find((s) => s.id === m.id);
    const stationMeta = workstationDefaults[m.station] || {
      name: `Station ${m.station + 1}`,
      stationCode: `STATION-${m.station + 1}`,
    };

    cards.push({
      id: ev.orderId,
      requestId: ev.orderId,
      materialId: m.id,
      materialName: m.description,
      partNumber: m.partNumber,
      workstation: `STN ${m.station + 1} · ${stationMeta.name}`,
      workstationIndex: m.station,
      storageLocation: `POU-STN-${m.station + 1}-BIN-1`,
      warehouseLocation: `WH-AISLE-${m.station + 1}-BAY-01`,
      currentInventory: stock?.onHand ?? m.binCapacity * m.bins,
      unit: m.unit,
      reorderThreshold: m.reorderPoint,
      safetyStock: m.safetyStock,
      binCapacity: m.binCapacity,
      binsCount: m.bins,
      requestedQuantity: ev.quantity || m.binCapacity,
      requestTimestamp: ev.time - m.leadMinutes * 60000,
      priority: "NORMAL",
      status: "REPLENISHMENT_COMPLETED",
      assignedHandler: "Material Handler Fleet",
      estimatedDeliveryTime: ev.time,
      completedTimestamp: ev.time,
    });
  }

  return cards;
}

export function filterKanbanCards(
  cards: VirtualKanbanCard[],
  filters: {
    workstation: number | "ALL";
    materialQuery: string;
    status: KanbanStage | "ALL";
    priority: "HIGH" | "NORMAL" | "LOW" | "ALL";
  },
): VirtualKanbanCard[] {
  return cards.filter((card) => {
    if (filters.workstation !== "ALL" && card.workstationIndex !== filters.workstation) {
      return false;
    }
    if (filters.status !== "ALL" && card.status !== filters.status) {
      return false;
    }
    if (filters.priority !== "ALL" && card.priority !== filters.priority) {
      return false;
    }
    if (filters.materialQuery.trim()) {
      const q = filters.materialQuery.toLowerCase();
      const matchPart = card.partNumber.toLowerCase().includes(q);
      const matchName = card.materialName.toLowerCase().includes(q);
      const matchId = card.id.toLowerCase().includes(q);
      if (!matchPart && !matchName && !matchId) {
        return false;
      }
    }
    return true;
  });
}

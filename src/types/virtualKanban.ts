export type KanbanStage =
  | "MATERIAL_AVAILABLE"
  | "REPLENISHMENT_REQUIRED"
  | "REQUEST_CREATED"
  | "PICKING_FROM_WAREHOUSE"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "REPLENISHMENT_COMPLETED";

export const KANBAN_STAGES: Array<{ key: KanbanStage; label: string; color: string; description: string }> = [
  {
    key: "MATERIAL_AVAILABLE",
    label: "Material Available",
    color: "#10b981", // emerald
    description: "Point-of-use inventory above reorder threshold",
  },
  {
    key: "REPLENISHMENT_REQUIRED",
    label: "Replenishment Required",
    color: "#f59e0b", // amber
    description: "Inventory breached reorder threshold; replenishment signal active",
  },
  {
    key: "REQUEST_CREATED",
    label: "Request Created",
    color: "#38bdf8", // sky
    description: "Kanban pull order generated and queued for warehouse handler",
  },
  {
    key: "PICKING_FROM_WAREHOUSE",
    label: "Picking from Warehouse",
    color: "#818cf8", // indigo
    description: "Material handler actively retrieving items from warehouse staging racks",
  },
  {
    key: "IN_TRANSIT",
    label: "In Transit",
    color: "#c084fc", // purple
    description: "Handler transporting replenishment batch along aisle route to station",
  },
  {
    key: "DELIVERED",
    label: "Delivered",
    color: "#06b6d4", // cyan
    description: "Materials physically staged at point-of-use buffer",
  },
  {
    key: "REPLENISHMENT_COMPLETED",
    label: "Replenishment Completed",
    color: "#14b8a6", // teal
    description: "Workstation stock verified, bins replenished, order finalized",
  },
];

export interface VirtualKanbanCard {
  id: string; // e.g. "KANBAN-REQ-0042" or "REPL-42"
  requestId: string; // Explicit Kanban request ID
  materialId: string;
  materialName: string;
  partNumber: string;
  workstation: string; // e.g. "Station 2: Liquid Cold-Plate & GPU Trays"
  workstationIndex: number; // 0..4
  storageLocation: string; // e.g. "POU-STN-2-BIN-1"
  warehouseLocation: string; // e.g. "WH-AISLE-3-BAY-A"
  currentInventory: number;
  unit: string;
  reorderThreshold: number;
  safetyStock: number;
  binCapacity: number;
  binsCount: number;
  requestedQuantity: number;
  requestTimestamp: number; // ms
  priority: "HIGH" | "NORMAL" | "LOW";
  status: KanbanStage;
  assignedHandler: string; // e.g. "Material Handler #2"
  estimatedDeliveryTime: number; // ms
  dispatchTimestamp?: number;
  completedTimestamp?: number;
}

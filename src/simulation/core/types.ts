import { z } from "zod";
const count = z.number().int().min(0).max(1000000);
export const materialInput = z
  .object({
    id: z.string().min(1).max(100),
    partNumber: z.string().min(1).max(100),
    description: z.string().max(500),
    unit: z.enum(["EA", "KIT", "M", "KG", "L"]),
    station: z.number().int().min(0).max(4),
    quantity: z.number().positive().max(10000),
    warehouse: count,
    pointOfUse: count,
    bins: z.number().int().min(2).max(20),
    binCapacity: count.refine((x) => x > 0),
    reorderPoint: count,
    safetyStock: count,
    leadMinutes: z.number().min(1).max(43200),
    sourceReference: z.string().min(1),
  })
  .strict()
  .superRefine((m, c) => {
    if (
      m.pointOfUse > m.bins * m.binCapacity ||
      m.reorderPoint > m.bins * m.binCapacity ||
      m.safetyStock > m.bins * m.binCapacity
    )
      c.addIssue({
        code: "custom",
        message: "Point-of-use stock and thresholds must fit bin capacity",
      });
    if (["EA", "KIT"].includes(m.unit) && !Number.isInteger(m.quantity))
      c.addIssue({
        code: "custom",
        message: "EA/KIT BOM quantities must be whole numbers",
      });
  });
export const simulationConfigSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    startDate: z.string().datetime(),
    durationMonths: z.number().int().min(1).max(6),
    timezone: z.literal("UTC"),
    modelCode: z.string().min(1).max(100),
    datasetKind: z.enum(["SYNTHETIC", "ACTUAL"]),
    dailyDemand: z.number().int().min(0).max(200),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    shiftStartHour: z.number().int().min(0).max(23),
    shiftHours: z.number().int().min(1).max(24),
    handlers: z.number().int().min(1).max(20),
    seed: z.number().int().min(0).max(2147483647),
    cycleSeconds: z.array(z.number().int().min(1).max(86400)).length(5),
    materials: z.array(materialInput).min(1).max(100),
    faults: z
      .array(
        z
          .object({
            station: z.number().int().min(0).max(4),
            start: z.string().datetime(),
            end: z.string().datetime(),
          })
          .strict(),
      )
      .max(100)
      .default([]),
    assumptions: z.array(z.string().max(1000)).max(100),
    sourceReferences: z.array(z.string().max(1000)).min(1).max(100),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.shiftStartHour + v.shiftHours > 24)
      c.addIssue({
        code: "custom",
        message: "Shifts must fit within one UTC day",
      });
    if (new Set(v.materials.map((m) => m.id)).size !== v.materials.length)
      c.addIssue({
        code: "custom",
        message:
          "Material IDs must be unique; use a distinct point-of-use ID per station",
      });
    if (new Set(v.workingDays).size !== v.workingDays.length)
      c.addIssue({ code: "custom", message: "Working days must be unique" });
    if (v.faults.some((f) => Date.parse(f.end) <= Date.parse(f.start)))
      c.addIssue({ code: "custom", message: "Fault end must follow start" });
  });
export type SimulationConfig = z.infer<typeof simulationConfigSchema>;
export type MaterialInput = z.infer<typeof materialInput>;
export type EventType =
  | "PRODUCTION_ORDER_CREATED"
  | "RACK_QUEUED"
  | "STATION_STARTED"
  | "MATERIAL_RESERVED"
  | "MATERIAL_CONSUMED"
  | "STATION_COMPLETED"
  | "RACK_MOVED"
  | "RACK_BLOCKED"
  | "MATERIAL_SHORTAGE"
  | "UPSTREAM_SHORTAGE"
  | "REPLENISHMENT_REQUESTED"
  | "REPLENISHMENT_PICKED"
  | "REPLENISHMENT_DISPATCHED"
  | "REPLENISHMENT_DELIVERED"
  | "STATION_RESUMED"
  | "RACK_COMPLETED"
  | "SHIFT_STARTED"
  | "SHIFT_ENDED"
  | "EQUIPMENT_DOWN"
  | "EQUIPMENT_UP"
  | "SIMULATION_COMPLETED";
export type SimEvent = {
  sequence: number;
  time: number;
  type: EventType;
  rackId?: string;
  station?: number;
  materialId?: string;
  quantity?: number;
  orderId?: string;
  reason?: string;
};
export type Rack = {
  id: string;
  priority: number;
  created: number;
  station: number;
  status: "QUEUED" | "RUNNING" | "BLOCKED" | "COMPLETED";
  ready: boolean;
  reason?: string;
  started?: number;
  operationStarted?: number;
  completed?: number;
};
export type Stock = {
  id: string;
  warehouse: number;
  warehouseReserved: number;
  onHand: number;
  reserved: number;
  inTransit: number;
  onOrder: number;
  consumed: number;
  shortages: number;
  upstreamShortage: boolean;
  stockArea: number;
  warehouseArea: number;
  lastTime: number;
};
export type Replenishment = {
  id: string;
  materialId: string;
  quantity: number;
  requested: number;
  dispatch: number;
  delivery: number;
  handler: number;
  status: "REQUESTED" | "IN_TRANSIT" | "DELIVERED";
};
export type Snapshot = {
  time: number;
  completed: number;
  queued: number;
  waiting: number;
  stations: (Rack | null)[];
  stocks: Stock[];
  orders: Replenishment[];
  busySeconds: number[];
  blockedSeconds: number[];
  shortageSeconds: number[];
  completedCycleSeconds: number;
  eventSequence: number;
};
export type SimulationResult = {
  config: SimulationConfig;
  engineVersion: string;
  end: number;
  events: SimEvent[];
  snapshots: Snapshot[];
  final: Snapshot;
  elapsedMs?: number;
};

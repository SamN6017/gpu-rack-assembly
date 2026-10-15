import sample from "../../../data/samples/synthetic-manufacturing.json";
import {
  SimulationConfig,
  simulationConfigSchema,
} from "@/simulation/core/types";
export function demoConfig(): SimulationConfig {
  const materials = sample.Materials.map((m) => {
    const bom = sample.BOM.find((b) => b.material_id === m.material_id)!;
    const rule = sample.KanbanRules.find(
      (r) => r.material_id === m.material_id,
    )!;
    return {
      id: m.material_id,
      partNumber: m.part_number,
      description: m.description,
      unit: m.unit_of_measure,
      station: Number(bom.station_id.slice(2)) - 1,
      quantity: bom.quantity_per_rack,
      warehouse: sample.Inventory.find(
        (i) => i.material_id === m.material_id && i.location_id === "LOC-WH",
      )!.quantity_on_hand,
      pointOfUse: sample.Inventory.find(
        (i) =>
          i.material_id === m.material_id &&
          i.location_id === rule.destination_location_id,
      )!.quantity_on_hand,
      bins: rule.number_of_bins,
      binCapacity: rule.units_per_bin,
      reorderPoint: rule.reorder_point,
      safetyStock: rule.safety_stock,
      leadMinutes: rule.lead_time_minutes,
      sourceReference:
        "GPU_Rack_Digital_Twin_Data.xlsx / Materials, BOM, Inventory, KanbanRules — synthetic",
    };
  });
  return simulationConfigSchema.parse({
    name: "Synthetic baseline",
    startDate: "2026-01-01T00:00:00.000Z",
    durationMonths: 6,
    timezone: "UTC",
    modelCode: "DEMO-GPU-RACK",
    datasetKind: "SYNTHETIC",
    dailyDemand: 15,
    workingDays: [1, 2, 3, 4, 5],
    shiftStartHour: 8,
    shiftHours: 8,
    handlers: 2,
    seed: 42,
    cycleSeconds: [720, 720, 720, 720, 720],
    materials,
    faults: [],
    assumptions: [
      "All quantities, demand and lead times are synthetic demonstration inputs.",
      "WS1–WS5 are mapped by sequence to the existing application stations for demonstration only; source station names differ.",
      "One UTC shift 08:00–16:00, Monday–Friday. No holiday calendar supplied.",
      "Two material handlers assumed. Picking is instantaneous; configured lead time includes transport.",
      "Consumption occurs at station start. Warehouse supply is finite with no external receipts.",
      "Seed is recorded; this version uses fixed processing and transport times without stochastic variation.",
    ],
    sourceReferences: [
      "GPU_Rack_Digital_Twin_Data.xlsx",
      "GPU_Rack_Digital_Twin_JSON.zip",
    ],
  });
}
export const presetNames = [
  "Baseline",
  "Increased demand",
  "Delayed replenishment",
  "Reduced inventory",
  "Optimized Kanban",
  "Custom",
] as const;
export function applyPreset(base: SimulationConfig, preset: string) {
  const c = structuredClone(base);
  c.name = preset === "Baseline" ? base.name : preset;
  switch (preset) {
    case "Increased demand":
      c.dailyDemand = Math.ceil(base.dailyDemand * 1.25);
      break;
    case "Delayed replenishment":
      c.materials.forEach((m) => (m.leadMinutes *= 2));
      break;
    case "Reduced inventory":
      c.materials.forEach((m) => {
        m.warehouse = Math.floor(m.warehouse * 0.5);
        m.pointOfUse = Math.floor(m.pointOfUse * 0.5);
      });
      break;
    case "Optimized Kanban":
      c.materials.forEach((m) => {
        m.binCapacity *= 2;
        m.reorderPoint *= 2;
      });
      c.assumptions.push(
        "Alternative bin configuration; improvement is unproven until compared.",
      );
      break;
  }
  return simulationConfigSchema.parse(c);
}

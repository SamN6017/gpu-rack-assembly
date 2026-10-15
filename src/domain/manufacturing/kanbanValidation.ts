import { z } from "zod";
import { idSchema } from "./schemas";
import { positiveQuantitySchema } from "./quantities";
import { assertUnitQuantity } from "./quantities";

export const locationTypeSchema = z.enum([
  "WAREHOUSE",
  "KANBAN_STORAGE",
  "POINT_OF_USE",
  "IN_TRANSIT",
]);

export const workstationMaterialMappingSchema = z
  .object({
    bomId: idSchema.optional(),
    rackModelId: idSchema,
    materialId: idSchema,
    workstationId: idSchema,
    quantityPerRack: positiveQuantitySchema,
    effectiveFrom: z.string().datetime({ offset: true }).optional(),
    effectiveTo: z.string().datetime({ offset: true }).nullable().optional(),
    sourceReference: z.string().min(1).default("ADMIN_OVERRIDE"),
  })
  .strict();

export const kanbanThresholdSchema = z
  .object({
    materialId: z.string().min(1),
    stationIndex: z.number().int().min(0).max(4),
    bins: z.number().int().min(1).max(50),
    binCapacity: z.number().positive(),
    reorderPoint: z.number().min(0),
    safetyStock: z.number().min(0),
    replenishmentQuantity: z.number().positive().optional(),
    leadMinutes: z.number().positive(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const totalCapacity = data.bins * data.binCapacity;
    if (data.reorderPoint > totalCapacity) {
      ctx.addIssue({
        code: "custom",
        message: `Reorder threshold (${data.reorderPoint}) cannot exceed total point-of-use capacity (${totalCapacity})`,
        path: ["reorderPoint"],
      });
    }
    if (data.safetyStock > totalCapacity) {
      ctx.addIssue({
        code: "custom",
        message: `Safety stock (${data.safetyStock}) cannot exceed total point-of-use capacity (${totalCapacity})`,
        path: ["safetyStock"],
      });
    }
    if (data.safetyStock > data.reorderPoint) {
      ctx.addIssue({
        code: "custom",
        message: `Safety stock (${data.safetyStock}) should not exceed reorder point (${data.reorderPoint})`,
        path: ["safetyStock"],
      });
    }
  });

export const inventoryValidationSchema = z
  .object({
    materialId: z.string().min(1),
    locationCode: z.string().min(1),
    locationType: locationTypeSchema,
    quantityOnHand: z.number().min(0),
    quantityReserved: z.number().min(0),
    unitOfMeasure: z.enum(["EA", "KIT", "M", "KG", "L"]),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.quantityReserved > data.quantityOnHand) {
      ctx.addIssue({
        code: "custom",
        message: `Reserved quantity (${data.quantityReserved}) cannot exceed on-hand quantity (${data.quantityOnHand})`,
        path: ["quantityReserved"],
      });
    }
    try {
      assertUnitQuantity(data.unitOfMeasure, String(data.quantityOnHand));
      assertUnitQuantity(data.unitOfMeasure, String(data.quantityReserved));
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: (e as Error).message,
        path: ["quantityOnHand"],
      });
    }
  });

export type WorkstationMaterialMapping = z.infer<typeof workstationMaterialMappingSchema>;
export type KanbanThreshold = z.infer<typeof kanbanThresholdSchema>;
export type InventoryValidation = z.infer<typeof inventoryValidationSchema>;

export interface DatasetValidationReport {
  datasetKind: "SYNTHETIC" | "ACTUAL";
  isVerifiedInventory: boolean;
  totalRecordsChecked: number;
  validRecordsCount: number;
  invalidRecordsCount: number;
  errors: Array<{
    entity: string;
    id: string;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    entity: string;
    id: string;
    message: string;
  }>;
}

/**
 * Validates dataset entities before allowing simulation or master data import.
 * Explicitly marks synthetic demonstration data as unverified.
 */
export function validateDemonstrationDataset(raw: {
  materials?: Array<Record<string, unknown>>;
  workstations?: Array<Record<string, unknown>>;
  boms?: Array<Record<string, unknown>>;
  inventory?: Array<Record<string, unknown>>;
  kanbanRules?: Array<Record<string, unknown>>;
}): DatasetValidationReport {
  const errors: DatasetValidationReport["errors"] = [];
  const warnings: DatasetValidationReport["warnings"] = [];
  let totalChecked = 0;
  let validCount = 0;

  const validMaterialIds = new Set<string>();
  const validWorkstationIds = new Set<string>();

  // 1. Materials validation
  for (const mat of raw.materials || []) {
    totalChecked++;
    const id = String(mat.id || mat.partNumber || "");
    if (!id) {
      errors.push({ entity: "Material", id: "unknown", field: "id", message: "Missing material ID" });
      continue;
    }
    validMaterialIds.add(id);
    validCount++;
  }

  // 2. Workstations validation
  for (const stn of raw.workstations || []) {
    totalChecked++;
    const id = String(stn.id || stn.stationCode || "");
    if (!id) {
      errors.push({ entity: "Workstation", id: "unknown", field: "id", message: "Missing workstation ID" });
      continue;
    }
    validWorkstationIds.add(id);
    validCount++;
  }

  // 3. BOM Relationships
  for (const b of raw.boms || []) {
    totalChecked++;
    const matId = String(b.materialId || "");
    const stnId = String(b.workstationId || "");
    let hasErr = false;

    if (!validMaterialIds.has(matId)) {
      errors.push({ entity: "BOM", id: String(b.id || "bom"), field: "materialId", message: `Referenced Material ${matId} does not exist` });
      hasErr = true;
    }
    if (!validWorkstationIds.has(stnId)) {
      errors.push({ entity: "BOM", id: String(b.id || "bom"), field: "workstationId", message: `Referenced Workstation ${stnId} does not exist` });
      hasErr = true;
    }

    const qty = Number(b.quantityPerRack);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push({ entity: "BOM", id: String(b.id || "bom"), field: "quantityPerRack", message: "quantityPerRack must be positive" });
      hasErr = true;
    }

    if (!hasErr) validCount++;
  }

  // 4. Inventory Quantities & Locations
  for (const inv of raw.inventory || []) {
    totalChecked++;
    const matId = String(inv.materialId || "");
    const onHand = Number(inv.onHand ?? inv.quantityOnHand ?? 0);
    const reserved = Number(inv.reserved ?? inv.quantityReserved ?? 0);

    let hasErr = false;
    if (onHand < 0) {
      errors.push({ entity: "Inventory", id: matId, field: "onHand", message: "Negative inventory balance is prohibited" });
      hasErr = true;
    }
    if (reserved < 0 || reserved > onHand) {
      errors.push({ entity: "Inventory", id: matId, field: "reserved", message: `Reserved quantity (${reserved}) exceeds on-hand (${onHand})` });
      hasErr = true;
    }
    if (!hasErr) validCount++;
  }

  // 5. Kanban Rules & Thresholds
  for (const rule of raw.kanbanRules || []) {
    totalChecked++;
    const matId = String(rule.materialId || "");
    const reorderPoint = Number(rule.reorderPoint ?? 0);
    const bins = Number(rule.bins ?? rule.numberOfBins ?? 2);
    const binCapacity = Number(rule.binCapacity ?? rule.unitsPerBin ?? 10);
    const totalCap = bins * binCapacity;

    let hasErr = false;
    if (reorderPoint > totalCap) {
      errors.push({ entity: "KanbanRule", id: matId, field: "reorderPoint", message: `Reorder point (${reorderPoint}) exceeds bin capacity (${totalCap})` });
      hasErr = true;
    }
    if (!hasErr) validCount++;
  }

  warnings.push({
    entity: "Dataset",
    id: "DATA_PROVENANCE",
    message: "Dataset is flagged as SYNTHETIC demonstration data. Not verified factory inventory.",
  });

  return {
    datasetKind: "SYNTHETIC",
    isVerifiedInventory: false,
    totalRecordsChecked: totalChecked,
    validRecordsCount: validCount,
    invalidRecordsCount: errors.length,
    errors,
    warnings,
  };
}

export const validateKanbanDataset = validateDemonstrationDataset;

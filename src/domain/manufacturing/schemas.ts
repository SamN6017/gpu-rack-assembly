import { z } from "zod";
import { quantitySchema, positiveQuantitySchema } from "./quantities";
const text = z.string().trim().min(1).max(500);
export const idSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });
export const datasetKindSchema = z.enum(["ACTUAL", "SYNTHETIC"]);
export const materialSchema = z
  .object({
    catalogNamespace: text,
    partNumber: text,
    description: text,
    category: text,
    unitOfMeasure: z.enum(["EA", "KIT", "M", "KG", "L"]),
    sourceReference: text,
    datasetKind: datasetKindSchema,
  })
  .strict();
export const rackModelSchema = z
  .object({
    modelCode: text,
    modelName: text,
    description: text.optional(),
    isActive: z.boolean().default(true),
    datasetKind: datasetKindSchema,
  })
  .strict();
export const bomSchema = z
  .object({
    rackModelId: idSchema,
    materialId: idSchema,
    workstationId: idSchema,
    quantityPerRack: positiveQuantitySchema,
    effectiveFrom: timestampSchema,
    effectiveTo: timestampSchema.nullable().optional(),
    sourceReference: text,
  })
  .strict()
  .refine(
    (v) =>
      !v.effectiveTo || Date.parse(v.effectiveTo) > Date.parse(v.effectiveFrom),
    "Effective end must follow start",
  );
export const inventoryEventSchema = z
  .object({
    materialId: idSchema,
    sourceLocationId: idSchema.nullable().default(null),
    destinationLocationId: idSchema.nullable().default(null),
    quantity: quantitySchema,
    eventType: z.enum([
      "RECEIPT",
      "TRANSFER",
      "CONSUMPTION",
      "ADJUSTMENT",
      "RETURN",
    ]),
    occurredAt: timestampSchema,
    sourceSystem: text.refine(
      (v) => !["SIMULATION", "REPLAY"].includes(v.toUpperCase()),
      "Operational events cannot originate in simulation or replay",
    ),
    externalEventId: text,
    correlationId: text,
    sourceReference: text,
    reason: text.nullable().default(null),
    reservationId: idSchema.nullable().default(null),
  })
  .strict()
  .superRefine((v, ctx) => {
    const from = v.sourceLocationId,
      to = v.destinationLocationId;
    const shape =
      v.eventType === "TRANSFER"
        ? from && to && from !== to
        : v.eventType === "CONSUMPTION"
          ? from && !to && v.reservationId
          : !from && to;
    if (!shape)
      ctx.addIssue({
        code: "custom",
        message: "Invalid locations or missing consumption reservation",
      });
    if (v.eventType !== "CONSUMPTION" && v.reservationId)
      ctx.addIssue({
        code: "custom",
        message: "Reservation is only valid for consumption",
      });
    if (v.eventType === "ADJUSTMENT") {
      if (!v.reason || /^-?0(?:\.0+)?$/.test(v.quantity))
        ctx.addIssue({
          code: "custom",
          message: "Adjustment requires a nonzero delta and reason",
        });
    } else if (!positiveQuantitySchema.safeParse(v.quantity).success)
      ctx.addIssue({ code: "custom", message: "Quantity must be positive" });
  });
export const reservationSchema = z
  .object({
    materialId: idSchema,
    locationId: idSchema,
    productionOrderId: idSchema,
    operationKey: text,
    quantity: positiveQuantitySchema,
    idempotencyKey: text,
  })
  .strict();
export const assumptionSchema = z
  .object({
    parameter: text,
    valueJson: z.union([z.string(), z.number().finite(), z.boolean()]),
    unit: text,
    rationale: text,
    sourceReference: text,
    datasetKind: datasetKindSchema,
    version: z.number().int().positive(),
  })
  .strict();
export const paginationSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();

import { z } from "zod";

export const eventTypeSchema = z.enum([
  "INVENTORY_OBSERVED",
  "RACK_QUEUED",
  "STATION_STARTED",
  "STATION_COMPLETED",
  "RACK_COMPLETED",
]);

export type ManufacturingEventType = z.infer<typeof eventTypeSchema>;

export const manufacturingEventSchema = z
  .object({
    eventId: z.string().min(1).max(200),
    sourceSystem: z.string().min(1).max(100),
    sourceTimestamp: z.string().datetime({ offset: true }),
    ingestionTimestamp: z.string().datetime({ offset: true }),
    eventType: eventTypeSchema,
    materialReference: z.string().max(100).optional(),
    rackReference: z.string().max(100).optional(),
    location: z.string().min(1).max(100),
    quantity: z.number().finite().min(0).max(1e12).optional(),
    unitOfMeasure: z.enum(["EA", "KIT", "M", "KG", "L"]).optional(),
    payloadVersion: z.literal(1),
    correlationId: z.string().min(1).max(200),
    datasetKind: z.enum(["ACTUAL", "SYNTHETIC"]),
    rawReference: z.string().min(1).max(1000),
  })
  .strict()
  .superRefine((e, c) => {
    if (
      e.eventType === "INVENTORY_OBSERVED" &&
      (!e.materialReference || e.quantity === undefined || !e.unitOfMeasure)
    ) {
      c.addIssue({
        code: "custom",
        message: "Inventory observations require materialReference, quantity and unitOfMeasure",
      });
    }
    if (e.eventType !== "INVENTORY_OBSERVED" && !e.rackReference) {
      c.addIssue({
        code: "custom",
        message: "Production events require a rackReference",
      });
    }
    if (
      ["EA", "KIT"].includes(e.unitOfMeasure || "") &&
      e.quantity !== undefined &&
      !Number.isInteger(e.quantity)
    ) {
      c.addIssue({
        code: "custom",
        message: "Indivisible units require integer quantities",
      });
    }
  });

export type ManufacturingEvent = z.infer<typeof manufacturingEventSchema>;

/**
 * In-memory chronological event projection with deduplication,
 * conflict detection, and out-of-order arrival tracking.
 */
export class EventProjection {
  private received = new Map<string, ManufacturingEvent>();
  private latest = new Map<string, ManufacturingEvent>();
  duplicates = 0;
  delayed = 0;
  conflicts = 0;
  lastIngestion: number | null = null;

  ingest(input: unknown): boolean {
    const event = manufacturingEventSchema.parse(input);
    const key = `${event.sourceSystem}:${event.eventId}`;
    const prior = this.received.get(key);

    if (prior) {
      const comparable = (e: ManufacturingEvent) =>
        JSON.stringify({ ...e, ingestionTimestamp: "" });
      if (comparable(prior) !== comparable(event)) {
        this.conflicts++;
        throw new Error("Event ID reused with different content");
      }
      this.duplicates++;
      return false;
    }

    this.received.set(key, event);

    const entity = `${event.sourceSystem}:${event.materialReference || event.rackReference}:${event.location}`;
    const current = this.latest.get(entity);

    if (
      current &&
      (event.sourceTimestamp < current.sourceTimestamp ||
        (event.sourceTimestamp === current.sourceTimestamp &&
          event.eventId < current.eventId))
    ) {
      this.delayed++;
    } else {
      this.latest.set(entity, event);
    }

    this.lastIngestion = Date.parse(event.ingestionTimestamp);
    return true;
  }

  snapshot() {
    return {
      events: [...this.latest.values()].sort(
        (a, b) =>
          a.sourceSystem.localeCompare(b.sourceSystem) ||
          a.eventId.localeCompare(b.eventId),
      ),
      duplicates: this.duplicates,
      delayed: this.delayed,
      conflicts: this.conflicts,
      lastIngestion: this.lastIngestion,
    };
  }

  replay(): ManufacturingEvent[] {
    return [...this.received.values()].sort(
      (a, b) =>
        Date.parse(a.sourceTimestamp) - Date.parse(b.sourceTimestamp) ||
        a.sourceSystem.localeCompare(b.sourceSystem) ||
        a.eventId.localeCompare(b.eventId),
    );
  }
}

import "server-only";
import { PrismaClient } from "@prisma/client";
import { ManufacturingEvent } from "@/domain/manufacturing/manufacturingEvent";

export interface ReconciledInventoryState {
  materialReference: string;
  location: string;
  quantity: number;
  unitOfMeasure: string;
  lastObservedAt: string;
}

export interface ReconciledRackState {
  rackReference: string;
  location: string;
  status: "QUEUED" | "IN_PROGRESS" | "COMPLETED";
  lastStation?: string;
  lastUpdatedAt: string;
}

export interface ReconciliationAuditReport {
  totalEvents: number;
  outOfOrderCount: number;
  earliestSourceTimestamp: string | null;
  latestSourceTimestamp: string | null;
  inventory: ReconciledInventoryState[];
  racks: ReconciledRackState[];
}

/**
 * Reconciles manufacturing inbox events into an authoritative read-only audit projection.
 * Properly orders out-of-order event streams without mutating database records.
 */
export async function reconcileInboxEvents(
  db: PrismaClient,
  sourceSystem?: string,
): Promise<ReconciliationAuditReport> {
  const where = sourceSystem ? { sourceSystem } : {};

  // Fetch events in arrival (insertion) order to detect out-of-order arrival
  const arrivalOrdered = await db.manufacturingInboxEvent.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  let outOfOrderCount = 0;
  let maxSourceTime = 0;

  for (const item of arrivalOrdered) {
    const itemTime = item.sourceTimestamp.getTime();
    if (itemTime < maxSourceTime) {
      outOfOrderCount++;
    } else {
      maxSourceTime = itemTime;
    }
  }

  // Now sort chronologically by sourceTimestamp ASC, eventId ASC to rebuild truth
  const chronological = [...arrivalOrdered].sort(
    (a, b) =>
      a.sourceTimestamp.getTime() - b.sourceTimestamp.getTime() ||
      a.eventId.localeCompare(b.eventId),
  );

  const inventoryMap = new Map<string, ReconciledInventoryState>();
  const rackMap = new Map<string, ReconciledRackState>();

  for (const item of chronological) {
    const event = item.normalizedJson as unknown as ManufacturingEvent;

    if (event.eventType === "INVENTORY_OBSERVED" && event.materialReference) {
      const key = `${event.materialReference}:${event.location}`;
      inventoryMap.set(key, {
        materialReference: event.materialReference,
        location: event.location,
        quantity: event.quantity ?? 0,
        unitOfMeasure: event.unitOfMeasure ?? "EA",
        lastObservedAt: event.sourceTimestamp,
      });
    } else if (event.rackReference) {
      const rackKey = event.rackReference;
      let status: "QUEUED" | "IN_PROGRESS" | "COMPLETED" = "IN_PROGRESS";
      let station = rackMap.get(rackKey)?.lastStation;

      if (event.eventType === "RACK_QUEUED") {
        status = "QUEUED";
      } else if (event.eventType === "STATION_STARTED") {
        status = "IN_PROGRESS";
        station = event.location;
      } else if (event.eventType === "STATION_COMPLETED") {
        status = "IN_PROGRESS";
        station = event.location;
      } else if (event.eventType === "RACK_COMPLETED") {
        status = "COMPLETED";
      }

      rackMap.set(rackKey, {
        rackReference: event.rackReference,
        location: event.location,
        status,
        lastStation: station,
        lastUpdatedAt: event.sourceTimestamp,
      });
    }
  }

  return {
    totalEvents: arrivalOrdered.length,
    outOfOrderCount,
    earliestSourceTimestamp: chronological.length
      ? chronological[0].sourceTimestamp.toISOString()
      : null,
    latestSourceTimestamp: chronological.length
      ? chronological[chronological.length - 1].sourceTimestamp.toISOString()
      : null,
    inventory: Array.from(inventoryMap.values()),
    racks: Array.from(rackMap.values()),
  };
}

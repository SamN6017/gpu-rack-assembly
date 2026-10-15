import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import {
  ingestManufacturingEvent,
  ingestEventBatch,
} from "@/server/services/ingestionService";
import { DomainError } from "@/server/services/transaction";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

describe("Live Telemetry Ingestion & Deduplication Integration", () => {
  const sampleEvent = {
    eventId: "LIVE-EVT-001",
    sourceSystem: "MES_SHOP_FLOOR",
    sourceTimestamp: "2026-01-01T08:00:00.000Z",
    ingestionTimestamp: "2026-01-01T08:00:01.000Z",
    eventType: "INVENTORY_OBSERVED",
    materialReference: "MAT-CHASSIS",
    location: "LOC-WH",
    quantity: 120,
    unitOfMeasure: "EA",
    payloadVersion: 1,
    correlationId: "CORR-001",
    datasetKind: "ACTUAL",
    rawReference: "MES-LINE1-BATCH01",
  };

  it("persists a new manufacturing inbox event and deduplicates exact duplicates idempotently", async () => {
    // 1. Initial ingestion
    const res1 = await ingestManufacturingEvent(db, sampleEvent);
    expect(res1.status).toBe("INGESTED");
    expect(res1.eventId).toBe("LIVE-EVT-001");

    expect(await db.manufacturingInboxEvent.count()).toBe(1);

    // 2. Exact duplicate ingestion (even if ingestionTimestamp differs locally)
    const duplicate = {
      ...sampleEvent,
      ingestionTimestamp: "2026-01-01T08:05:00.000Z", // Local receive time changed
    };
    const res2 = await ingestManufacturingEvent(db, duplicate);
    expect(res2.status).toBe("DUPLICATE");
    expect(res2.id).toBe(res1.id);

    // Count in database must remain exactly 1
    expect(await db.manufacturingInboxEvent.count()).toBe(1);
  });

  it("rejects conflicting event ID reuse when payload attributes differ", async () => {
    await ingestManufacturingEvent(db, sampleEvent);

    const conflictingEvent = {
      ...sampleEvent,
      quantity: 999, // Altered quantity under same event ID
    };

    await expect(
      ingestManufacturingEvent(db, conflictingEvent),
    ).rejects.toThrow(DomainError);

    await expect(
      ingestManufacturingEvent(db, conflictingEvent),
    ).rejects.toThrow("already exists with differing payload");
  });

  it("processes batch ingestion with accurate counts for new and duplicate records", async () => {
    const event2 = {
      ...sampleEvent,
      eventId: "LIVE-EVT-002",
      materialReference: "MAT-POWER-SUPPLY",
    };

    const batch = [
      sampleEvent,
      sampleEvent, // duplicate of 1
      event2, // new
      event2, // duplicate of 2
    ];

    const summary = await ingestEventBatch(db, batch);

    expect(summary.total).toBe(4);
    expect(summary.ingested).toBe(2);
    expect(summary.duplicates).toBe(2);
    expect(await db.manufacturingInboxEvent.count()).toBe(2);
  });
});

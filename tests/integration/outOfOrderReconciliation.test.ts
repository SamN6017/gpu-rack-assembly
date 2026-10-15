import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { ingestManufacturingEvent } from "@/server/services/ingestionService";
import { reconcileInboxEvents } from "@/server/services/reconciliationService";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

describe("Out-of-Order Telemetry Reconciliation Integration", () => {
  it("reconciles scrambled and delayed events into authoritative chronological state", async () => {
    // Ingest events in reverse order:
    // Event 3 arrives first (10:00 UTC, completed)
    // Event 2 arrives second (09:00 UTC, station 2 completed)
    // Event 1 arrives third (08:00 UTC, station 1 started)
    const eventCompleted = {
      eventId: "EVT-RECON-3",
      sourceSystem: "MES_SHOP_FLOOR",
      sourceTimestamp: "2026-01-01T10:00:00.000Z",
      ingestionTimestamp: "2026-01-01T10:00:01.000Z",
      eventType: "RACK_COMPLETED",
      rackReference: "RACK-TEST-001",
      location: "LINE-EXIT",
      payloadVersion: 1,
      correlationId: "CORR-R1",
      datasetKind: "ACTUAL",
      rawReference: "MES-EXIT-01",
    };

    const eventStation2 = {
      eventId: "EVT-RECON-2",
      sourceSystem: "MES_SHOP_FLOOR",
      sourceTimestamp: "2026-01-01T09:00:00.000Z",
      ingestionTimestamp: "2026-01-01T10:00:02.000Z",
      eventType: "STATION_COMPLETED",
      rackReference: "RACK-TEST-001",
      location: "WS2",
      payloadVersion: 1,
      correlationId: "CORR-R1",
      datasetKind: "ACTUAL",
      rawReference: "MES-WS2-01",
    };

    const eventStation1 = {
      eventId: "EVT-RECON-1",
      sourceSystem: "MES_SHOP_FLOOR",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T10:00:03.000Z",
      eventType: "STATION_STARTED",
      rackReference: "RACK-TEST-001",
      location: "WS1",
      payloadVersion: 1,
      correlationId: "CORR-R1",
      datasetKind: "ACTUAL",
      rawReference: "MES-WS1-01",
    };

    // Ingest in scrambled arrival order
    await ingestManufacturingEvent(db, eventCompleted);
    await ingestManufacturingEvent(db, eventStation2);
    await ingestManufacturingEvent(db, eventStation1);

    // Also add an inventory observation
    await ingestManufacturingEvent(db, {
      eventId: "EVT-INV-RECON",
      sourceSystem: "MES_SHOP_FLOOR",
      sourceTimestamp: "2026-01-01T08:30:00.000Z",
      ingestionTimestamp: "2026-01-01T10:00:04.000Z",
      eventType: "INVENTORY_OBSERVED",
      materialReference: "MAT-NVLINK",
      location: "WS2-BIN-1",
      quantity: 16,
      unitOfMeasure: "EA",
      payloadVersion: 1,
      correlationId: "CORR-INV-1",
      datasetKind: "ACTUAL",
      rawReference: "BARCODE-SCAN-01",
    });

    const report = await reconcileInboxEvents(db, "MES_SHOP_FLOOR");

    expect(report.totalEvents).toBe(4);
    expect(report.outOfOrderCount).toBeGreaterThanOrEqual(2);
    expect(report.earliestSourceTimestamp).toBe("2026-01-01T08:00:00.000Z");
    expect(report.latestSourceTimestamp).toBe("2026-01-01T10:00:00.000Z");

    // Chronologically reconciled rack state must reflect final status (COMPLETED)
    expect(report.racks).toHaveLength(1);
    const rack = report.racks[0];
    expect(rack.rackReference).toBe("RACK-TEST-001");
    expect(rack.status).toBe("COMPLETED");
    expect(rack.location).toBe("LINE-EXIT");

    // Inventory observation correctly mapped
    expect(report.inventory).toHaveLength(1);
    expect(report.inventory[0].materialReference).toBe("MAT-NVLINK");
    expect(report.inventory[0].quantity).toBe(16);
  });
});

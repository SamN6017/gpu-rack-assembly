import { describe, it, expect } from "vitest";
import {
  manufacturingEventSchema,
  EventProjection,
} from "@/domain/manufacturing/manufacturingEvent";
import { RealtimeAssemblyProvider } from "@/services/realtimeAssemblyProvider";
import { ReplayAssemblyProvider } from "@/services/replayAssemblyProvider";
import { MockLiveAdapter } from "@/services/adapters";

describe("Live Telemetry Event Validation & Projection Domain", () => {
  it("validates valid inventory observation events", () => {
    const valid = {
      eventId: "EVT-INV-01",
      sourceSystem: "SAP_ERP",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "INVENTORY_OBSERVED",
      materialReference: "MAT-GPU-01",
      location: "LOC-WH",
      quantity: 100,
      unitOfMeasure: "EA",
      payloadVersion: 1,
      correlationId: "CORR-01",
      datasetKind: "ACTUAL",
      rawReference: "ERP-DOC-9876",
    };

    const parsed = manufacturingEventSchema.parse(valid);
    expect(parsed.eventId).toBe("EVT-INV-01");
    expect(parsed.quantity).toBe(100);
  });

  it("validates valid rack production lifecycle events", () => {
    const valid = {
      eventId: "EVT-PROD-01",
      sourceSystem: "MES_FACTORY",
      sourceTimestamp: "2026-01-01T08:15:00.000Z",
      ingestionTimestamp: "2026-01-01T08:15:01.000Z",
      eventType: "STATION_STARTED",
      rackReference: "RACK-2026-001",
      location: "WS1",
      payloadVersion: 1,
      correlationId: "CORR-PROD-01",
      datasetKind: "ACTUAL",
      rawReference: "MES-OP-101",
    };

    const parsed = manufacturingEventSchema.parse(valid);
    expect(parsed.eventType).toBe("STATION_STARTED");
    expect(parsed.rackReference).toBe("RACK-2026-001");
  });

  it("rejects inventory observations missing materialReference, quantity or unitOfMeasure", () => {
    const invalid = {
      eventId: "EVT-INV-BAD",
      sourceSystem: "SAP_ERP",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "INVENTORY_OBSERVED",
      location: "LOC-WH",
      payloadVersion: 1,
      correlationId: "CORR-01",
      datasetKind: "ACTUAL",
      rawReference: "DOC",
    };

    expect(() => manufacturingEventSchema.parse(invalid)).toThrow(
      "Inventory observations require materialReference, quantity and unitOfMeasure",
    );
  });

  it("rejects production events missing rackReference", () => {
    const invalid = {
      eventId: "EVT-PROD-BAD",
      sourceSystem: "MES_FACTORY",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "STATION_STARTED",
      location: "WS1",
      payloadVersion: 1,
      correlationId: "CORR-01",
      datasetKind: "ACTUAL",
      rawReference: "DOC",
    };

    expect(() => manufacturingEventSchema.parse(invalid)).toThrow(
      "Production events require a rackReference",
    );
  });

  it("rejects non-integer quantities for indivisible units of measure (EA, KIT)", () => {
    const fractionalEA = {
      eventId: "EVT-INV-FRACTION",
      sourceSystem: "SAP_ERP",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "INVENTORY_OBSERVED",
      materialReference: "MAT-CHASSIS",
      location: "LOC-WH",
      quantity: 5.5, // Invalid fractional quantity for EA
      unitOfMeasure: "EA",
      payloadVersion: 1,
      correlationId: "CORR-01",
      datasetKind: "ACTUAL",
      rawReference: "DOC",
    };

    expect(() => manufacturingEventSchema.parse(fractionalEA)).toThrow(
      "Indivisible units require integer quantities",
    );
  });

  it("manages deduplication, conflict detection, and out-of-order tracking in EventProjection", () => {
    const projection = new EventProjection();

    const event1 = {
      eventId: "EVT-100",
      sourceSystem: "MES",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "STATION_STARTED" as const,
      rackReference: "RACK-1",
      location: "WS1",
      payloadVersion: 1 as const,
      correlationId: "C1",
      datasetKind: "ACTUAL" as const,
      rawReference: "RAW-1",
    };

    // 1. Initial ingestion succeeds
    expect(projection.ingest(event1)).toBe(true);

    // 2. Exact duplicate is ignored idempotently
    expect(projection.ingest(event1)).toBe(false);
    expect(projection.duplicates).toBe(1);

    // 3. Duplicate ID with differing content throws conflict
    const conflicting = { ...event1, location: "WS2" };
    expect(() => projection.ingest(conflicting)).toThrow(
      "Event ID reused with different content",
    );
    expect(projection.conflicts).toBe(1);

    // 4. Out-of-order event arrival increments delayed counter
    const priorTimestampEvent = {
      ...event1,
      eventId: "EVT-099",
      sourceTimestamp: "2026-01-01T07:30:00.000Z",
    };
    expect(projection.ingest(priorTimestampEvent)).toBe(true);
    expect(projection.delayed).toBe(1);

    // 5. Replay yields chronologically sorted events
    const replayed = projection.replay();
    expect(replayed[0].eventId).toBe("EVT-099");
    expect(replayed[1].eventId).toBe("EVT-100");
  });

  it("enforces strict read-only capability in RealtimeAssemblyProvider", () => {
    const provider = new RealtimeAssemblyProvider(new MockLiveAdapter());
    expect(provider.isReadOnly).toBe(true);

    expect(() => provider.addRackToQueue()).toThrow(
      "Live mode is strictly read-only: factory control commands are prohibited.",
    );
    expect(() => provider.dispatchNextFromQueue()).toThrow(
      "Live mode is strictly read-only",
    );
    expect(() => provider.advanceStation()).toThrow(
      "Live mode is strictly read-only",
    );
    expect(() => provider.toggleStationBlock()).toThrow(
      "Live mode is strictly read-only",
    );
    expect(() => provider.stressTestRack()).toThrow(
      "Live mode is strictly read-only",
    );
    expect(() => provider.resetSimulation()).toThrow(
      "Live mode is strictly read-only",
    );
  });

  it("enforces strict read-only capability in ReplayAssemblyProvider", () => {
    const provider = new ReplayAssemblyProvider([]);
    expect(provider.isReadOnly).toBe(true);

    expect(() => provider.addRackToQueue()).toThrow(
      "Replay mode is read-only: factory control commands are prohibited.",
    );
    expect(() => provider.advanceStation()).toThrow(
      "Replay mode is read-only",
    );
    expect(() => provider.toggleStationBlock()).toThrow(
      "Replay mode is read-only",
    );
  });
});

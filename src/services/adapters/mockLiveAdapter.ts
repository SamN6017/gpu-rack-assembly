import { ImportedEventAdapter } from "./importEventAdapter";

/**
 * Mock live adapter that streams synthetic manufacturing events
 * for demonstrations, testing, and offline live-flow validation.
 */
export class MockLiveAdapter extends ImportedEventAdapter {
  constructor() {
    super([
      {
        eventId: "demo-observation-1",
        sourceSystem: "MOCK_DEMO",
        sourceTimestamp: "2026-01-01T08:00:00.000Z",
        ingestionTimestamp: "2026-01-01T08:00:01.000Z",
        eventType: "INVENTORY_OBSERVED",
        materialReference: "DEMO-CHASSIS",
        location: "DEMO-WAREHOUSE",
        quantity: 500,
        unitOfMeasure: "EA",
        payloadVersion: 1,
        correlationId: "demo-init",
        datasetKind: "SYNTHETIC",
        rawReference: "Synthetic mock observation; not connected to a live factory source",
      },
      {
        eventId: "demo-rack-queued-1",
        sourceSystem: "MOCK_DEMO",
        sourceTimestamp: "2026-01-01T08:05:00.000Z",
        ingestionTimestamp: "2026-01-01T08:05:01.000Z",
        eventType: "RACK_QUEUED",
        rackReference: "RACK-MOCK-001",
        location: "LINE-1-QUEUE",
        payloadVersion: 1,
        correlationId: "demo-queue",
        datasetKind: "SYNTHETIC",
        rawReference: "Synthetic queue event",
      },
      {
        eventId: "demo-station-started-1",
        sourceSystem: "MOCK_DEMO",
        sourceTimestamp: "2026-01-01T08:06:00.000Z",
        ingestionTimestamp: "2026-01-01T08:06:01.000Z",
        eventType: "STATION_STARTED",
        rackReference: "RACK-MOCK-001",
        location: "WS1-CHASSIS",
        payloadVersion: 1,
        correlationId: "demo-start",
        datasetKind: "SYNTHETIC",
        rawReference: "Synthetic workstation start event",
      },
    ]);
  }
}

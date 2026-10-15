import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { db, setupDatabase, clearDatabase } from "./databaseHarness";
import { ingestManufacturingEvent } from "@/server/services/ingestionService";
import { saveScenario, enqueueRun } from "@/server/services/simulationService";
import { processNextRun } from "@/server/workers/simulationWorker";
import { demoConfig } from "@/domain/manufacturing/scenarioPresets";

beforeAll(setupDatabase);
beforeEach(clearDatabase);
afterAll(() => db.$disconnect());

describe("Mode Isolation: Live Ingestion vs. Simulation vs. Operational Tables", () => {
  it("strictly segregates live telemetry, simulation runs, and operational inventory tables", async () => {
    // 1. Ingest Live Telemetry Event into Inbox
    const liveEvent = {
      eventId: "LIVE-ISOLATION-01",
      sourceSystem: "ERP_LIVE",
      sourceTimestamp: "2026-01-01T08:00:00.000Z",
      ingestionTimestamp: "2026-01-01T08:00:01.000Z",
      eventType: "INVENTORY_OBSERVED",
      materialReference: "MAT-CHASSIS",
      location: "LOC-WH",
      quantity: 500,
      unitOfMeasure: "EA",
      payloadVersion: 1,
      correlationId: "CORR-ISO-1",
      datasetKind: "ACTUAL",
      rawReference: "ERP-DOC-001",
    };

    const ingested = await ingestManufacturingEvent(db, liveEvent);
    expect(ingested.status).toBe("INGESTED");

    // 2. Queue and execute a Discrete-Event Simulation Run
    const config = demoConfig();
    config.durationMonths = 1;
    config.dailyDemand = 2;
    const scenario = await saveScenario(db, config);
    const run = await enqueueRun(db, scenario.id);
    await processNextRun(db);

    const completed = await db.simulationRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(completed.status).toBe("COMPLETED");

    // 3. Strict Isolation Invariants:
    // Operational inventory tables must NEVER be modified by either simulation or live inbox
    expect(await db.inventoryEvent.count()).toBe(0);
    expect(await db.inventoryBalance.count()).toBe(0);

    // Live inbox contains ONLY the live telemetry event
    const inboxEvents = await db.manufacturingInboxEvent.findMany();
    expect(inboxEvents).toHaveLength(1);
    expect(inboxEvents[0].sourceSystem).toBe("ERP_LIVE");

    // Simulation events table contains ONLY the discrete simulation events for the run
    const simEventCount = await db.simulationEvent.count({
      where: { runId: run.id },
    });
    expect(simEventCount).toBeGreaterThan(100);

    // Cross-contamination checks
    const contaminatedSimEvents = await db.simulationEvent.count({
      where: { eventType: "INVENTORY_OBSERVED" },
    });
    expect(contaminatedSimEvents).toBe(0);
  });
});
